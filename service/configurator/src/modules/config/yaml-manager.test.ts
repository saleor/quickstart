import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SaleorConfig } from "./schema";
import { YamlConfigurationManager, type FileSystem } from "./yaml-manager";

describe("YamlConfigurationManager", () => {
  let mockFs: FileSystem;
  let manager: YamlConfigurationManager;
  const CONFIG_PATH = "test-config.yml";

  beforeEach(() => {
    mockFs = {
      readFile: vi.fn(),
      writeFile: vi.fn(),
    } as unknown as FileSystem;
    manager = new YamlConfigurationManager(CONFIG_PATH, mockFs);
  });

  it("should save configuration to YAML file", async () => {
    const config: SaleorConfig = {
      shop: {
        defaultMailSenderName: "Test Store",
        defaultMailSenderAddress: "test@example.com",
      },
    };

    await manager.save(config);

    expect(mockFs.writeFile).toHaveBeenCalledWith(
      CONFIG_PATH,
      expect.stringContaining("defaultMailSenderName: Test Store")
    );
  });

  it("should load configuration from YAML file", async () => {
    const yamlContent = `
      shop:
        defaultMailSenderName: Test Store
        defaultMailSenderAddress: test@example.com
    `;
    (mockFs.readFile as any).mockResolvedValue(yamlContent);

    const config = await manager.load();

    expect(config).toEqual({
      shop: {
        defaultMailSenderName: "Test Store",
        defaultMailSenderAddress: "test@example.com",
      },
    });
  });

  it("should throw error when file not found", async () => {
    const error = new Error("File not found");
    (error as NodeJS.ErrnoException).code = "ENOENT";
    (mockFs.readFile as any).mockRejectedValue(error);

    await expect(manager.load()).rejects.toThrow(
      `Configuration file not found: ${CONFIG_PATH}`
    );
  });

  it("should throw error when YAML is invalid", async () => {
    (mockFs.readFile as any).mockResolvedValue("invalid: yaml: content:");

    await expect(manager.load()).rejects.toThrow();
  });

  it("should throw error when config schema is invalid", async () => {
    const yamlContent = `
      shop:
        defaultMailSenderName: 123
    `;
    (mockFs.readFile as any).mockResolvedValue(yamlContent);

    await expect(manager.load()).rejects.toThrow("Invalid configuration file");
  });
});
