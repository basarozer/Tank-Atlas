import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
export const records = sqliteTable('atlas_records', {id:text('id').primaryKey(),kind:text('kind').notNull(),payload:text('payload').notNull(),version:integer('version').notNull(),updatedAt:text('updated_at').notNull(),recordKey:text('record_key').unique()});

export const notes = sqliteTable('atlas_notes', {id:text('id').primaryKey(),tankId:text('tank_id').notNull(),text:text('text').notNull(),noteDate:text('note_date').notNull(),createdAt:text('created_at').notNull(),author:text('author').notNull(),source:text('source').notNull()}, table=>[index('atlas_notes_tank_idx').on(table.tankId)]);
