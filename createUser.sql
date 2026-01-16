CREATE TABLE IF NOT EXISTS `users` (
                                       `id` int(11) NOT NULL AUTO_INCREMENT,
    `email` varchar(255) NOT NULL,
    `password` varchar(255) NOT NULL,
    `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `nom` varchar(100) DEFAULT NULL,
    `prenom` varchar(100) DEFAULT NULL,
    `role` varchar(50) DEFAULT 'user',
    PRIMARY KEY (`id`),
    UNIQUE KEY `email` (`email`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Utiliser INSERT IGNORE pour éviter les erreurs de doublons sur l'email
INSERT IGNORE INTO `users` (`email`, `password`, `role`, `nom`, `prenom`) VALUES
('user@example.com', 'password123', 'user', 'User', 'Standard'),
('admin@example.com', 'admin123', 'admin', 'Admin', 'Système');