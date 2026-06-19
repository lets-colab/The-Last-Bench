CREATE TABLE `applications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`studentId` int NOT NULL,
	`universityName` varchar(255) NOT NULL,
	`programName` varchar(255) NOT NULL,
	`country` varchar(100),
	`applicationStatus` enum('draft','documents_received','profile_analyzed','shortlisted','application_drafted','submitted_to_university','under_review','offer_received','visa_application_filed','visa_decision','pre_departure','rejected') NOT NULL DEFAULT 'draft',
	`estimatedCost` varchar(50),
	`visaSuccessRate` varchar(10),
	`acceptanceRate` varchar(10),
	`mentorAssigned` int,
	`lastUpdatedBy` int,
	`lastUpdatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `applications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `cohort_members` (
	`id` int AUTO_INCREMENT NOT NULL,
	`cohortId` int NOT NULL,
	`studentId` int NOT NULL,
	`joinedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `cohort_members_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `cohorts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`destination` varchar(100),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `cohorts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `documents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`applicationId` int NOT NULL,
	`documentType` varchar(100) NOT NULL,
	`fileUrl` text NOT NULL,
	`fileName` varchar(255) NOT NULL,
	`uploadedBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `documents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `mentors` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`expertise` text,
	`bio` text,
	`verificationStatus` enum('pending','verified','rejected') DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `mentors_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`senderId` int NOT NULL,
	`recipientId` int NOT NULL,
	`content` text NOT NULL,
	`fileUrl` text,
	`isRead` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`type` varchar(100) NOT NULL,
	`title` varchar(255) NOT NULL,
	`message` text,
	`relatedEntityId` int,
	`isRead` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `referrals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tutorId` int NOT NULL,
	`studentId` int NOT NULL,
	`referralCode` varchar(50) NOT NULL,
	`commissionPercentage` varchar(10) DEFAULT '5',
	`commissionAmount` varchar(50),
	`commissionStatus` enum('pending','earned','paid') DEFAULT 'pending',
	`payoutMethod` varchar(50),
	`payoutDetails` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `referrals_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `skills` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`category` varchar(100),
	`difficulty` enum('beginner','intermediate','advanced') DEFAULT 'beginner',
	`duration` varchar(50),
	`content` text,
	`videoUrl` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `skills_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `students` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`class` varchar(50),
	`fieldOfInterest` varchar(100),
	`destinationPreference` varchar(100),
	`gpa` varchar(10),
	`transcriptUrl` text,
	`referralCode` varchar(50),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `students_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tutors` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`centerName` varchar(255) NOT NULL,
	`location` varchar(255),
	`expertiseAreas` text,
	`referralCode` varchar(50) NOT NULL,
	`totalReferred` int DEFAULT 0,
	`totalEarned` varchar(50) DEFAULT '0',
	`status` enum('active','inactive','suspended') DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tutors_id` PRIMARY KEY(`id`),
	CONSTRAINT `tutors_referralCode_unique` UNIQUE(`referralCode`)
);
