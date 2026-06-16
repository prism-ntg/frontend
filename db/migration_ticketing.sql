-- Migration: Ticketing System
-- Run this SQL against your database to add the new columns

-- Add role and status columns to users table
ALTER TABLE users
  ADD COLUMN role VARCHAR(50) NOT NULL DEFAULT 'admin',
  ADD COLUMN status VARCHAR(50) NOT NULL DEFAULT 'active';

-- Add ticketing fields to aset_komplain table
ALTER TABLE aset_komplain
  ADD COLUMN ticket_status VARCHAR(50) NULL,
  ADD COLUMN assigned_user_id INT NULL;
