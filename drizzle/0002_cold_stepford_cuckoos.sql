CREATE INDEX `atlas_notes_tank_idx` ON `atlas_notes` (`tank_id`);--> statement-breakpoint
CREATE TRIGGER atlas_notes_no_update BEFORE UPDATE ON atlas_notes BEGIN SELECT RAISE(ABORT, 'Notes are append-only'); END;
--> statement-breakpoint
CREATE TRIGGER atlas_notes_no_delete BEFORE DELETE ON atlas_notes BEGIN SELECT RAISE(ABORT, 'Notes are append-only'); END;
--> statement-breakpoint
CREATE TRIGGER atlas_notes_require_tank BEFORE INSERT ON atlas_notes WHEN NOT EXISTS (SELECT 1 FROM atlas_records WHERE id=NEW.tank_id AND kind='tank') BEGIN SELECT RAISE(ABORT, 'Note tank does not exist'); END;
--> statement-breakpoint
CREATE TRIGGER atlas_tank_retain_notes BEFORE DELETE ON atlas_records WHEN EXISTS (SELECT 1 FROM atlas_notes WHERE tank_id=OLD.id) BEGIN SELECT RAISE(ABORT, 'Tank has permanent notes'); END;
