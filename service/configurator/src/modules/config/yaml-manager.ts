import { readFile, writeFile } from "node:fs/promises";
import { stringify, parse } from "yaml";
import { configSchema, type SaleorConfig } from "./schema";
import { logger } from "../../lib/logger";

export interface FileSystem {
  readFile(path: string, encoding: string): Promise<string>;
  writeFile(path: string, data: string): Promise<void>;
}

export class NodeFileSystem implements FileSystem {
  async readFile(path: string, encoding: BufferEncoding): Promise<string> {
    return readFile(path, encoding);
  }

  async writeFile(path: string, data: string): Promise<void> {
    return writeFile(path, data);
  }
}

export interface ConfigurationStorage {
  save(config: SaleorConfig): Promise<void>;
  load(): Promise<SaleorConfig>;
}

export const DEFAULT_CONFIG_PATH = "config.yml";

export class YamlConfigurationManager implements ConfigurationStorage {
  constructor(
    private readonly configPath: string = DEFAULT_CONFIG_PATH,
    private readonly fs: FileSystem = new NodeFileSystem()
  ) {
    logger.debug("Initializing YamlConfigurationManager", { configPath });
  }

  async save(config: SaleorConfig) {
    logger.info("Saving configuration to " + this.configPath);
    try {
      const yml = stringify(config);
      await this.fs.writeFile(this.configPath, yml);
      logger.debug("Saved configuration", { config });
    } catch (error) {
      logger.error("Failed to save configuration", {
        error,
        path: this.configPath,
      });
      throw error;
    }
  }

  async load(): Promise<SaleorConfig> {
    logger.debug("Loading configuration");
    try {
      const yml = await this.fs.readFile(this.configPath, "utf-8");
      const rawConfig = parse(yml);
      logger.debug("Raw YAML configuration", { rawConfig });

      const { success, data, error } = configSchema.safeParse(rawConfig);

      logger.debug("Parsed configuration", { data });

      if (!success) {
        const validationError = new Error(
          "Invalid configuration file. " +
            error.errors.map((issue) => issue.message).join(", ")
        );
        logger.error("Configuration validation failed", {
          errors: error.errors,
          path: this.configPath,
        });
        throw validationError;
      }

      logger.info("Loaded configuration from " + this.configPath);
      logger.debug("Validated configuration", { config: data });
      return data;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        const fileNotFoundError = new Error(
          `Configuration file not found: ${this.configPath}`
        );
        logger.error("Configuration file not found", { path: this.configPath });
        throw fileNotFoundError;
      }
      logger.error("Failed to load configuration", {
        error,
        path: this.configPath,
      });
      throw error;
    }
  }
}
