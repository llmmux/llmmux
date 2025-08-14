-- CreateTable
CREATE TABLE `api_keys` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `key` VARCHAR(255) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `description` TEXT NULL,
    `owner` VARCHAR(255) NULL,
    `tags` JSON NULL,
    `rateLimitRpm` INTEGER NULL,
    `rateLimitRpd` INTEGER NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `expiresAt` DATETIME(3) NULL,
    `lastUsedAt` DATETIME(3) NULL,

    UNIQUE INDEX `api_keys_key_key`(`key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `api_key_permissions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `apiKeyId` INTEGER NOT NULL,
    `allowAll` BOOLEAN NOT NULL DEFAULT true,
    `allowedModels` JSON NULL,
    `deniedModels` JSON NULL,

    UNIQUE INDEX `api_key_permissions_apiKeyId_key`(`apiKeyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `api_key_metrics` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `apiKeyId` INTEGER NOT NULL,
    `modelName` VARCHAR(255) NOT NULL,
    `totalRequests` INTEGER NOT NULL DEFAULT 0,
    `successfulRequests` INTEGER NOT NULL DEFAULT 0,
    `failedRequests` INTEGER NOT NULL DEFAULT 0,
    `totalTokens` BIGINT NOT NULL DEFAULT 0,
    `totalResponseTimeMs` BIGINT NOT NULL DEFAULT 0,
    `lastRequestAt` DATETIME(3) NULL,

    INDEX `api_key_metrics_apiKeyId_idx`(`apiKeyId`),
    INDEX `api_key_metrics_modelName_idx`(`modelName`),
    UNIQUE INDEX `api_key_metrics_apiKeyId_modelName_key`(`apiKeyId`, `modelName`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `request_logs` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `apiKeyId` INTEGER NOT NULL,
    `modelName` VARCHAR(255) NOT NULL,
    `success` BOOLEAN NOT NULL,
    `tokens` INTEGER NOT NULL DEFAULT 0,
    `responseTimeMs` INTEGER NOT NULL DEFAULT 0,
    `requestPath` VARCHAR(500) NULL,
    `statusCode` INTEGER NULL,
    `errorMessage` TEXT NULL,
    `requestTimestamp` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `request_logs_apiKeyId_requestTimestamp_idx`(`apiKeyId`, `requestTimestamp`),
    INDEX `request_logs_modelName_requestTimestamp_idx`(`modelName`, `requestTimestamp`),
    INDEX `request_logs_requestTimestamp_idx`(`requestTimestamp`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `api_key_permissions` ADD CONSTRAINT `api_key_permissions_apiKeyId_fkey` FOREIGN KEY (`apiKeyId`) REFERENCES `api_keys`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `api_key_metrics` ADD CONSTRAINT `api_key_metrics_apiKeyId_fkey` FOREIGN KEY (`apiKeyId`) REFERENCES `api_keys`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `request_logs` ADD CONSTRAINT `request_logs_apiKeyId_fkey` FOREIGN KEY (`apiKeyId`) REFERENCES `api_keys`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
