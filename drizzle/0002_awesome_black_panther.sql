CREATE TABLE `aiChatMessages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`studentId` int NOT NULL,
	`role` enum('user','assistant') NOT NULL,
	`content` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `aiChatMessages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `aiMemories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`studentId` int NOT NULL,
	`memoryKey` varchar(100) NOT NULL,
	`memoryValue` text NOT NULL,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `aiMemories_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `errorFixes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`errorSignature` varchar(191) NOT NULL,
	`diagnosis` text NOT NULL,
	`fixStrategy` enum('retry','fallback','degrade','reconnect','manual') NOT NULL,
	`fixDetail` text,
	`autoApplied` int NOT NULL DEFAULT 0,
	`successCount` int NOT NULL DEFAULT 0,
	`failureCount` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `errorFixes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `errorLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`signature` varchar(191) NOT NULL,
	`source` varchar(191) NOT NULL,
	`message` text NOT NULL,
	`stack` text,
	`context` text,
	`status` enum('open','diagnosed','healed','ignored') NOT NULL DEFAULT 'open',
	`occurrences` int NOT NULL DEFAULT 1,
	`lastSeenAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `errorLogs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('user','admin','tutor','mentor') NOT NULL DEFAULT 'user';--> statement-breakpoint
ALTER TABLE `students` ADD `telegramChatId` varchar(100);--> statement-breakpoint
ALTER TABLE `students` ADD `whatsappPhone` varchar(20);--> statement-breakpoint
ALTER TABLE `students` ADD `telegramLinkCode` varchar(10);--> statement-breakpoint
ALTER TABLE `students` ADD `notifyPush` int DEFAULT 1;--> statement-breakpoint
ALTER TABLE `students` ADD `notifyTelegram` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `students` ADD `notifyWhatsapp` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `users` ADD `expoPushToken` text;