CREATE DATABASE IF NOT EXISTS detective_game;
USE detective_game;

CREATE TABLE IF NOT EXISTS suspects (
    suspect_id INT PRIMARY KEY,
    name VARCHAR(100),
    age INT,
    occupation VARCHAR(100),
    alibi TEXT,
    location VARCHAR(100),
    clothing VARCHAR(50),
    fingerprint_match BOOLEAN,
    suspicion_score INT
);

CREATE TABLE IF NOT EXISTS locations (
    location_id INT PRIMARY KEY,
    name VARCHAR(100),
    description TEXT
);

CREATE TABLE IF NOT EXISTS evidence (
    evidence_id INT PRIMARY KEY,
    type VARCHAR(100),
    location VARCHAR(100),
    description TEXT,
    related_suspect_id INT,
    FOREIGN KEY (related_suspect_id) REFERENCES suspects(suspect_id)
);

CREATE TABLE IF NOT EXISTS witnesses (
    witness_id INT PRIMARY KEY,
    statement TEXT,
    location VARCHAR(100),
    time VARCHAR(50)
);