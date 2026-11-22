-- Migration: allow outreach messages in AI generation history
--
-- AiToolsService.generateOutreach() persists its output with
-- tool_type = 'outreach_message', but ai_tool_type only declared the five
-- generic content tools (bio, resume, cover_letter, gig_description,
-- profile_summary). Every outreach generation that reached the history insert
-- failed the enum constraint, so the feature could never record what it wrote.
--
-- This is a forward-only, additive change; the already-applied enum migration is
-- left untouched. PostgreSQL refuses to use a newly added enum value inside the
-- same transaction that adds it, so nothing in this file writes that value.

ALTER TYPE public.ai_tool_type ADD VALUE IF NOT EXISTS 'outreach_message';
