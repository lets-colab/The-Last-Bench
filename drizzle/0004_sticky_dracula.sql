CREATE TABLE `auditLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`actorUserId` int NOT NULL,
	`action` varchar(100) NOT NULL,
	`entityType` varchar(50) NOT NULL,
	`entityId` int NOT NULL,
	`detail` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `auditLogs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `cohort_messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`cohortId` int NOT NULL,
	`studentId` int NOT NULL,
	`content` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `cohort_messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `payouts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tutorId` int NOT NULL,
	`amount` varchar(50) NOT NULL,
	`method` enum('bKash','Nagad') NOT NULL,
	`accountNumber` varchar(30) NOT NULL,
	`status` enum('requested','approved','rejected','paid') NOT NULL DEFAULT 'requested',
	`adminNote` text,
	`requestedAt` timestamp NOT NULL DEFAULT (now()),
	`resolvedAt` timestamp,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `payouts_id` PRIMARY KEY(`id`)
);
