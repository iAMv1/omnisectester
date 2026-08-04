const Ajv = require('ajv');
const yaml = require('yaml');
const fs = require('fs-extra');
const path = require('path');
const logger = require('./logger');

const ajv = new Ajv();

// JSON Schema for omnisectester.yaml
const configSchema = {
  type: 'object',
  properties: {
    version: { type: 'string', pattern: '^2\\.0\\.0$' },
    engagement: {
      type: 'object',
      properties: {
        mode: { 
          type: 'string',
          enum: ['automated', 'gray_box', 'red_team', 'purple_team', 'continuous']
        },
        authorization: { type: 'string' },
        kill_switch: { type: 'boolean' },
        safety_baseline: { type: 'string', format: 'date-time' }
      },
      required: ['mode']
    },
    threat_model: {
      type: 'object',
      properties: {
        enabled: { type: 'boolean' },
        frameworks: {
          type: 'array',
          items: { type: 'string', enum: ['STRIDE', 'PASTA', 'ATTACK'] }
        },
        adversary_profiles: { type: 'array', items: { type: 'string' } }
      }
    },
    targets: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          type: { type: 'string' },
          url: { type: 'string', format: 'uri' },
          platforms: { type: 'array', items: { type: 'string' } }
        }
      }
    },
    testing: {
      type: 'object',
      properties: {
        authentication: { type: 'boolean' },
        business_logic: { type: 'boolean' },
        supply_chain: { type: 'boolean' },
        cloud_security: { type: 'boolean' },
        memory_corruption: { type: 'boolean' },
        rate_limit: {
          type: 'object',
          properties: {
            requests_per_second: { type: 'number', minimum: 0 }
          }
        },
        destructive: { type: 'boolean' },
        force: { type: 'boolean' }
      }
    },
    reporting: {
      type: 'object',
      properties: {
        formats: {
          type: 'array',
          items: { 
            type: 'string',
            enum: ['json', 'html', 'pdf', 'sarif', 'attack_nav', 'junit']
          }
        },
        output_dir: { type: 'string' },
        compliance_frameworks: {
          type: 'array',
          items: {
            type: 'string',
            enum: ['pci_dss', 'nist_800_53', 'soc2', 'iso27001']
          }
        }
      }
    },
    scoring: {
      type: 'object',
      properties: {
        cvss_version: { type: 'string' },
        epss_enabled: { type: 'boolean' },
        ssvc_enabled: { type: 'boolean' }
      }
    }
  },
  required: ['version']
};

const validate = ajv.compile(configSchema);

async function loadConfig(configPath) {
  try {
    const absolutePath = path.resolve(configPath);
    
    if (!await fs.pathExists(absolutePath)) {
      logger.warn(`Config file not found: ${configPath}`);
      logger.info('Using default configuration');
      return getDefaultConfig();
    }

    const content = await fs.readFile(absolutePath, 'utf8');
    const config = yaml.parse(content);

    const valid = validate(config);
    if (!valid) {
      logger.error('Configuration validation failed:');
      validate.errors.forEach(err => {
        logger.error(`  ${err.instancePath}: ${err.message}`);
      });
      throw new Error('Invalid configuration');
    }

    logger.success('Configuration validated');
    return config;
  } catch (error) {
    logger.error('Failed to load configuration:', error.message);
    throw error;
  }
}

function getDefaultConfig() {
  return {
    version: '2.0.0',
    engagement: {
      mode: 'gray_box',
      kill_switch: true
    },
    threat_model: {
      enabled: true,
      frameworks: ['STRIDE', 'PASTA', 'ATTACK'],
      adversary_profiles: ['APT29']
    },
    testing: {
      authentication: true,
      business_logic: true,
      supply_chain: true,
      cloud_security: true,
      memory_corruption: true,
      rate_limit: { requests_per_second: 1 },
      destructive: false,
      force: false
    },
    reporting: {
      formats: ['json', 'html'],
      output_dir: './reports',
      compliance_frameworks: ['pci_dss', 'nist_800_53', 'soc2', 'iso27001']
    },
    scoring: {
      cvss_version: '4.0',
      epss_enabled: true,
      ssvc_enabled: true
    }
  };
}

async function validateTarget(target) {
  const errors = [];

  if (!target.type) {
    errors.push('Target type is required');
  }

  const validTypes = ['web', 'extension', 'desktop', 'mobile', 'cloud', 'supply-chain', 'cicd', 'ai', 'firmware'];
  if (target.type && !validTypes.includes(target.type)) {
    errors.push(`Invalid target type: ${target.type}. Valid types: ${validTypes.join(', ')}`);
  }

  if (target.type === 'web' && !target.url) {
    errors.push('Web targets require a URL');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

module.exports = {
  loadConfig,
  validate,
  validateTarget,
  getDefaultConfig
};

