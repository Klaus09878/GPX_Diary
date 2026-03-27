const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const initSqlJs = require('sql.js');

class MetadataStore {
    constructor({ dbFilePath, sqlJsDistDir }) {
        this.dbFilePath = dbFilePath;
        this.sqlJsDistDir = sqlJsDistDir;
        this.db = null;
        this.SQL = null;
        this.readyPromise = null;
        this.writeChain = Promise.resolve();
    }

    async initialize() {
        if (this.db) {
            return this;
        }

        this.SQL = await initSqlJs({
            locateFile: (file) => path.join(this.sqlJsDistDir, file)
        });

        let dbBytes = null;
        if (fs.existsSync(this.dbFilePath)) {
            dbBytes = fs.readFileSync(this.dbFilePath);
        }

        this.db = dbBytes && dbBytes.length
            ? new this.SQL.Database(dbBytes)
            : new this.SQL.Database();

        this.db.run('PRAGMA foreign_keys = ON;');
        this.ensureSchema();
        this.persist();
        return this;
    }

    async ready() {
        if (!this.readyPromise) {
            this.readyPromise = this.initialize();
        }

        await this.readyPromise;
        return this;
    }

    ensureSchema() {
        this.db.run(`
            CREATE TABLE IF NOT EXISTS activities (
                activity_id TEXT PRIMARY KEY,
                profile TEXT NOT NULL,
                filename TEXT NOT NULL,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL,
                UNIQUE(profile, filename)
            );
        `);

        this.db.run(`
            CREATE TABLE IF NOT EXISTS activity_notes (
                activity_id TEXT PRIMARY KEY,
                perceived_form INTEGER,
                weather_feeling INTEGER,
                sleep_quality INTEGER,
                rpe INTEGER,
                note_text TEXT,
                updated_at INTEGER NOT NULL,
                FOREIGN KEY(activity_id) REFERENCES activities(activity_id) ON DELETE CASCADE
            );
        `);

        this.db.run(`
            CREATE TABLE IF NOT EXISTS segment_favorites (
                favorite_id INTEGER PRIMARY KEY AUTOINCREMENT,
                activity_id TEXT NOT NULL,
                label TEXT,
                start_index INTEGER NOT NULL,
                end_index INTEGER NOT NULL,
                source TEXT,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL,
                FOREIGN KEY(activity_id) REFERENCES activities(activity_id) ON DELETE CASCADE
            );
        `);

        this.db.run(`
            CREATE TABLE IF NOT EXISTS equipment (
                equipment_id INTEGER PRIMARY KEY AUTOINCREMENT,
                profile TEXT NOT NULL,
                name TEXT NOT NULL,
                category TEXT,
                notes TEXT,
                service_interval_km REAL,
                service_warn_km REAL NOT NULL DEFAULT 0,
                service_start_km REAL NOT NULL DEFAULT 0,
                is_active INTEGER NOT NULL DEFAULT 1,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL
            );
        `);

        this.db.run(`
            CREATE TABLE IF NOT EXISTS activity_equipment_assignments (
                activity_id TEXT PRIMARY KEY,
                equipment_id INTEGER NOT NULL,
                assigned_at INTEGER NOT NULL,
                FOREIGN KEY(activity_id) REFERENCES activities(activity_id) ON DELETE CASCADE,
                FOREIGN KEY(equipment_id) REFERENCES equipment(equipment_id) ON DELETE CASCADE
            );
        `);

        this.db.run(`
            CREATE INDEX IF NOT EXISTS idx_activities_profile_filename
            ON activities(profile, filename);
        `);

        this.db.run(`
            CREATE INDEX IF NOT EXISTS idx_activity_notes_updated
            ON activity_notes(updated_at DESC);
        `);

        this.db.run(`
            CREATE INDEX IF NOT EXISTS idx_segment_favorites_activity
            ON segment_favorites(activity_id, updated_at DESC);
        `);

        this.db.run(`
            CREATE INDEX IF NOT EXISTS idx_equipment_profile_updated
            ON equipment(profile, updated_at DESC);
        `);

        this.db.run(`
            CREATE INDEX IF NOT EXISTS idx_activity_equipment_equipment
            ON activity_equipment_assignments(equipment_id, assigned_at DESC);
        `);

        this.db.run(`
            CREATE TABLE IF NOT EXISTS workouts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                date TEXT NOT NULL,
                type TEXT NOT NULL,
                duration_sec REAL,
                distance_km REAL,
                elevation_gain_m REAL,
                avg_speed REAL,
                max_speed REAL,
                avg_hr REAL,
                max_hr REAL,
                avg_power REAL,
                max_power REAL,
                avg_cadence REAL,
                vertical_oscillation REAL,
                ground_contact_time REAL,
                trimp REAL,
                tss REAL,
                hr_recovery REAL,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL
            );
        `);

        this.db.run(`
            CREATE INDEX IF NOT EXISTS idx_workouts_date
            ON workouts(date);
        `);

        this.db.run(`
            CREATE TABLE IF NOT EXISTS health_metrics (
                date TEXT PRIMARY KEY,
                resting_hr REAL,
                hrv_ms REAL,
                vo2_max REAL,
                respiratory_rate REAL,
                spo2 REAL,
                wrist_temp REAL,
                sleep_duration_min REAL,
                sleep_quality_pct REAL,
                body_battery REAL,
                stress_score REAL,
                weight_kg REAL,
                body_fat_pct REAL,
                lean_mass_kg REAL,
                updated_at INTEGER NOT NULL
            );
        `);

        this.db.run(`
            CREATE TABLE IF NOT EXISTS hr_zones (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                workout_id INTEGER NOT NULL,
                z0_sec REAL,
                z1_sec REAL,
                z2_sec REAL,
                z3_sec REAL,
                z4_sec REAL,
                z5_sec REAL,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL,
                FOREIGN KEY(workout_id) REFERENCES workouts(id) ON DELETE CASCADE
            );
        `);

        this.db.run(`
            CREATE INDEX IF NOT EXISTS idx_hr_zones_workout
            ON hr_zones(workout_id);
        `);

        this.db.run(`
            CREATE TABLE IF NOT EXISTS health_steps (
                date TEXT PRIMARY KEY,
                steps INTEGER NOT NULL,
                updated_at INTEGER NOT NULL
            );
        `);
    }

    persist() {
        const exportBytes = this.db.export();
        fs.mkdirSync(path.dirname(this.dbFilePath), { recursive: true });
        fs.writeFileSync(this.dbFilePath, Buffer.from(exportBytes));
    }

    async withWrite(callback) {
        this.writeChain = this.writeChain.then(async () => {
            await this.ready();
            const result = await callback(this.db);
            this.persist();
            return result;
        });

        return this.writeChain;
    }

    async queryAll(sql, params = []) {
        await this.ready();
        const stmt = this.db.prepare(sql);
        stmt.bind(params);
        const rows = [];
        while (stmt.step()) {
            rows.push(stmt.getAsObject());
        }
        stmt.free();
        return rows;
    }

    async queryOne(sql, params = []) {
        const rows = await this.queryAll(sql, params);
        return rows[0] || null;
    }

    makeActivityId(profile, filename) {
        return crypto
            .createHash('sha1')
            .update(`${profile}::${filename}`)
            .digest('hex')
            .slice(0, 24);
    }

    normalizeScore(value) {
        if (value === null || value === undefined) {
            return null;
        }

        if (typeof value === 'string' && value.trim() === '') {
            return null;
        }

        const parsed = Number(value);
        if (!Number.isFinite(parsed)) {
            return null;
        }

        const rounded = Math.round(parsed);
        return Math.max(1, Math.min(5, rounded));
    }

    normalizeNotePayload(payload = {}) {
        const noteText = typeof payload.noteText === 'string' ? payload.noteText.trim() : '';
        return {
            perceivedForm: this.normalizeScore(payload.perceivedForm),
            weatherFeeling: this.normalizeScore(payload.weatherFeeling),
            sleepQuality: this.normalizeScore(payload.sleepQuality),
            rpe: this.normalizeScore(payload.rpe),
            noteText: noteText.slice(0, 5000)
        };
    }

    mapNoteRow(row, filename) {
        const noteText = typeof row?.noteText === 'string' ? row.noteText : '';
        const updatedAt = Number(row?.noteUpdatedAt || row?.updatedAt || 0) || 0;
        return {
            activityId: row?.activityId || null,
            filename,
            perceivedForm: row?.perceivedForm === null || row?.perceivedForm === undefined ? null : Number(row.perceivedForm),
            weatherFeeling: row?.weatherFeeling === null || row?.weatherFeeling === undefined ? null : Number(row.weatherFeeling),
            sleepQuality: row?.sleepQuality === null || row?.sleepQuality === undefined ? null : Number(row.sleepQuality),
            rpe: row?.rpe === null || row?.rpe === undefined ? null : Number(row.rpe),
            noteText,
            notePreview: noteText ? noteText.slice(0, 180) : '',
            hasNote: Boolean(noteText || row?.perceivedForm || row?.weatherFeeling || row?.sleepQuality || row?.rpe),
            updatedAt
        };
    }

    normalizeFavoriteIndex(value, fieldName) {
        const parsed = Number.parseInt(value, 10);
        if (!Number.isInteger(parsed) || parsed < 0) {
            throw new Error(`${fieldName} is invalid`);
        }

        return parsed;
    }

    normalizeSegmentFavoritePayload(payload = {}) {
        const filename = typeof payload.filename === 'string' ? payload.filename.trim() : '';
        if (!filename) {
            throw new Error('filename is required');
        }

        const startIndex = this.normalizeFavoriteIndex(payload.startIndex, 'startIndex');
        const endIndex = this.normalizeFavoriteIndex(payload.endIndex, 'endIndex');
        if (endIndex <= startIndex) {
            throw new Error('endIndex must be greater than startIndex');
        }

        const label = typeof payload.label === 'string' ? payload.label.trim().slice(0, 140) : '';
        const source = payload.source === 'suggested' ? 'suggested' : 'manual';

        return {
            filename,
            startIndex,
            endIndex,
            label,
            source
        };
    }

    mapSegmentFavoriteRow(row) {
        return {
            favoriteId: row?.favoriteId === null || row?.favoriteId === undefined ? null : Number(row.favoriteId),
            activityId: row?.activityId || null,
            filename: row?.filename || '',
            label: typeof row?.label === 'string' ? row.label : '',
            startIndex: row?.startIndex === null || row?.startIndex === undefined ? null : Number(row.startIndex),
            endIndex: row?.endIndex === null || row?.endIndex === undefined ? null : Number(row.endIndex),
            source: typeof row?.source === 'string' && row.source ? row.source : 'manual',
            createdAt: Number(row?.createdAt || 0) || 0,
            updatedAt: Number(row?.updatedAt || 0) || 0
        };
    }

    normalizeEquipmentDistance(value, { allowNull = false, defaultValue = 0, fieldName = 'distance' } = {}) {
        if (value === null || value === undefined || (typeof value === 'string' && value.trim() === '')) {
            return allowNull ? null : defaultValue;
        }

        const parsed = Number(value);
        if (!Number.isFinite(parsed) || parsed < 0) {
            throw new Error(`${fieldName} is invalid`);
        }

        return parsed;
    }

    normalizeEquipmentPayload(payload = {}, { requireName = true } = {}) {
        const name = typeof payload.name === 'string' ? payload.name.trim().slice(0, 100) : '';
        if (requireName && !name) {
            throw new Error('name is required');
        }

        const category = typeof payload.category === 'string' ? payload.category.trim().slice(0, 80) : '';
        const notes = typeof payload.notes === 'string' ? payload.notes.trim().slice(0, 2000) : '';
        const serviceIntervalKm = this.normalizeEquipmentDistance(payload.serviceIntervalKm, {
            allowNull: true,
            fieldName: 'serviceIntervalKm'
        });
        let serviceWarnKm = this.normalizeEquipmentDistance(payload.serviceWarnKm, {
            allowNull: false,
            defaultValue: 0,
            fieldName: 'serviceWarnKm'
        });
        const serviceStartKm = this.normalizeEquipmentDistance(payload.serviceStartKm, {
            allowNull: false,
            defaultValue: 0,
            fieldName: 'serviceStartKm'
        });

        if (serviceIntervalKm !== null && serviceWarnKm > serviceIntervalKm) {
            serviceWarnKm = serviceIntervalKm;
        }

        return {
            name,
            category,
            notes,
            serviceIntervalKm,
            serviceWarnKm,
            serviceStartKm,
            isActive: payload.isActive === undefined ? true : Boolean(payload.isActive)
        };
    }

    mapEquipmentRow(row) {
        return {
            equipmentId: row?.equipmentId === null || row?.equipmentId === undefined ? null : Number(row.equipmentId),
            profile: row?.profile || '',
            name: typeof row?.name === 'string' ? row.name : '',
            category: typeof row?.category === 'string' ? row.category : '',
            notes: typeof row?.notes === 'string' ? row.notes : '',
            serviceIntervalKm: row?.serviceIntervalKm === null || row?.serviceIntervalKm === undefined
                ? null
                : Number(row.serviceIntervalKm),
            serviceWarnKm: Number(row?.serviceWarnKm || 0) || 0,
            serviceStartKm: Number(row?.serviceStartKm || 0) || 0,
            isActive: Number(row?.isActive || 0) !== 0,
            createdAt: Number(row?.createdAt || 0) || 0,
            updatedAt: Number(row?.updatedAt || 0) || 0
        };
    }

    mapActivityEquipmentAssignmentRow(row, filenameFallback = '') {
        return {
            activityId: row?.activityId || null,
            filename: row?.filename || filenameFallback,
            equipmentId: row?.equipmentId === null || row?.equipmentId === undefined ? null : Number(row.equipmentId),
            equipmentName: typeof row?.equipmentName === 'string' ? row.equipmentName : '',
            assignedAt: Number(row?.assignedAt || 0) || 0
        };
    }

    async upsertActivity(profile, filename) {
        const activityId = this.makeActivityId(profile, filename);
        const now = Date.now();

        await this.withWrite((db) => {
            db.run(`
                INSERT INTO activities (activity_id, profile, filename, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?)
                ON CONFLICT(profile, filename)
                DO UPDATE SET updated_at = excluded.updated_at
            `, [activityId, profile, filename, now, now]);
        });

        return activityId;
    }

    async syncProfileActivities(profile, filenames = []) {
        if (!Array.isArray(filenames) || filenames.length === 0) {
            return;
        }

        const uniqueFiles = Array.from(new Set(filenames.filter(name => typeof name === 'string' && name)));
        const now = Date.now();

        await this.withWrite((db) => {
            uniqueFiles.forEach((filename) => {
                const activityId = this.makeActivityId(profile, filename);
                db.run(`
                    INSERT INTO activities (activity_id, profile, filename, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?)
                    ON CONFLICT(profile, filename)
                    DO UPDATE SET updated_at = excluded.updated_at
                `, [activityId, profile, filename, now, now]);
            });
        });
    }

    async getNote(profile, filename) {
        await this.upsertActivity(profile, filename);

        const row = await this.queryOne(`
            SELECT
                a.activity_id AS activityId,
                a.filename AS filename,
                n.perceived_form AS perceivedForm,
                n.weather_feeling AS weatherFeeling,
                n.sleep_quality AS sleepQuality,
                n.rpe AS rpe,
                COALESCE(n.note_text, '') AS noteText,
                COALESCE(n.updated_at, 0) AS noteUpdatedAt
            FROM activities a
            LEFT JOIN activity_notes n ON n.activity_id = a.activity_id
            WHERE a.profile = ? AND a.filename = ?
            LIMIT 1
        `, [profile, filename]);

        if (!row) {
            return this.mapNoteRow(null, filename);
        }

        return this.mapNoteRow(row, filename);
    }

    async saveNote(profile, filename, payload = {}) {
        const activityId = await this.upsertActivity(profile, filename);
        const note = this.normalizeNotePayload(payload);
        const updatedAt = Date.now();

        await this.withWrite((db) => {
            db.run(`
                INSERT INTO activity_notes (
                    activity_id,
                    perceived_form,
                    weather_feeling,
                    sleep_quality,
                    rpe,
                    note_text,
                    updated_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(activity_id)
                DO UPDATE SET
                    perceived_form = excluded.perceived_form,
                    weather_feeling = excluded.weather_feeling,
                    sleep_quality = excluded.sleep_quality,
                    rpe = excluded.rpe,
                    note_text = excluded.note_text,
                    updated_at = excluded.updated_at
            `, [
                activityId,
                note.perceivedForm,
                note.weatherFeeling,
                note.sleepQuality,
                note.rpe,
                note.noteText,
                updatedAt
            ]);
        });

        return this.getNote(profile, filename);
    }

    async listNotes(profile) {
        const rows = await this.queryAll(`
            SELECT
                a.activity_id AS activityId,
                a.filename AS filename,
                n.perceived_form AS perceivedForm,
                n.weather_feeling AS weatherFeeling,
                n.sleep_quality AS sleepQuality,
                n.rpe AS rpe,
                COALESCE(n.note_text, '') AS noteText,
                COALESCE(n.updated_at, 0) AS noteUpdatedAt
            FROM activities a
            LEFT JOIN activity_notes n ON n.activity_id = a.activity_id
            WHERE a.profile = ?
            ORDER BY CASE WHEN COALESCE(n.updated_at, 0) > 0 THEN 0 ELSE 1 END,
                     COALESCE(n.updated_at, a.updated_at) DESC,
                     a.filename ASC
        `, [profile]);

        return rows.map((row) => this.mapNoteRow(row, row.filename));
    }

    async getSegmentFavorite(profile, favoriteId) {
        const normalizedId = Number.parseInt(favoriteId, 10);
        if (!Number.isInteger(normalizedId) || normalizedId <= 0) {
            return null;
        }

        const row = await this.queryOne(`
            SELECT
                f.favorite_id AS favoriteId,
                a.activity_id AS activityId,
                a.filename AS filename,
                COALESCE(f.label, '') AS label,
                f.start_index AS startIndex,
                f.end_index AS endIndex,
                COALESCE(f.source, 'manual') AS source,
                COALESCE(f.created_at, 0) AS createdAt,
                COALESCE(f.updated_at, 0) AS updatedAt
            FROM segment_favorites f
            INNER JOIN activities a ON a.activity_id = f.activity_id
            WHERE a.profile = ? AND f.favorite_id = ?
            LIMIT 1
        `, [profile, normalizedId]);

        return row ? this.mapSegmentFavoriteRow(row) : null;
    }

    async listSegmentFavorites(profile) {
        const rows = await this.queryAll(`
            SELECT
                f.favorite_id AS favoriteId,
                a.activity_id AS activityId,
                a.filename AS filename,
                COALESCE(f.label, '') AS label,
                f.start_index AS startIndex,
                f.end_index AS endIndex,
                COALESCE(f.source, 'manual') AS source,
                COALESCE(f.created_at, 0) AS createdAt,
                COALESCE(f.updated_at, 0) AS updatedAt
            FROM segment_favorites f
            INNER JOIN activities a ON a.activity_id = f.activity_id
            WHERE a.profile = ?
            ORDER BY COALESCE(f.updated_at, 0) DESC, a.filename ASC, f.favorite_id DESC
        `, [profile]);

        return rows.map((row) => this.mapSegmentFavoriteRow(row));
    }

    async saveSegmentFavorite(profile, payload = {}, favoriteId = null) {
        const favorite = this.normalizeSegmentFavoritePayload(payload);
        const activityId = await this.upsertActivity(profile, favorite.filename);
        const updatedAt = Date.now();
        const normalizedId = Number.parseInt(favoriteId, 10);

        if (Number.isInteger(normalizedId) && normalizedId > 0) {
            let affectedRows = 0;
            await this.withWrite((db) => {
                db.run(`
                    UPDATE segment_favorites
                    SET
                        activity_id = ?,
                        label = ?,
                        start_index = ?,
                        end_index = ?,
                        source = ?,
                        updated_at = ?
                    WHERE favorite_id = ?
                      AND activity_id IN (
                        SELECT activity_id
                        FROM activities
                        WHERE profile = ?
                    )
                `, [
                    activityId,
                    favorite.label,
                    favorite.startIndex,
                    favorite.endIndex,
                    favorite.source,
                    updatedAt,
                    normalizedId,
                    profile
                ]);

                const changesStmt = db.prepare('SELECT changes() AS changes');
                if (changesStmt.step()) {
                    const row = changesStmt.getAsObject();
                    affectedRows = Number(row.changes) || 0;
                }
                changesStmt.free();
            });

            if (affectedRows <= 0) {
                return null;
            }

            return this.getSegmentFavorite(profile, normalizedId);
        }

        let insertedId = 0;
        await this.withWrite((db) => {
            db.run(`
                INSERT INTO segment_favorites (
                    activity_id,
                    label,
                    start_index,
                    end_index,
                    source,
                    created_at,
                    updated_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [
                activityId,
                favorite.label,
                favorite.startIndex,
                favorite.endIndex,
                favorite.source,
                updatedAt,
                updatedAt
            ]);

            const idStmt = db.prepare('SELECT last_insert_rowid() AS id');
            if (idStmt.step()) {
                const row = idStmt.getAsObject();
                insertedId = Number(row.id) || 0;
            }
            idStmt.free();
        });

        return this.getSegmentFavorite(profile, insertedId);
    }

    async removeSegmentFavorite(profile, favoriteId) {
        const normalizedId = Number.parseInt(favoriteId, 10);
        if (!Number.isInteger(normalizedId) || normalizedId <= 0) {
            return false;
        }

        let affectedRows = 0;
        await this.withWrite((db) => {
            db.run(`
                DELETE FROM segment_favorites
                WHERE favorite_id = ?
                  AND activity_id IN (
                    SELECT activity_id
                    FROM activities
                    WHERE profile = ?
                  )
            `, [normalizedId, profile]);

            const changesStmt = db.prepare('SELECT changes() AS changes');
            if (changesStmt.step()) {
                const row = changesStmt.getAsObject();
                affectedRows = Number(row.changes) || 0;
            }
            changesStmt.free();
        });

        return affectedRows > 0;
    }

    async getEquipment(profile, equipmentId) {
        const normalizedId = Number.parseInt(equipmentId, 10);
        if (!Number.isInteger(normalizedId) || normalizedId <= 0) {
            return null;
        }

        const row = await this.queryOne(`
            SELECT
                equipment_id AS equipmentId,
                profile AS profile,
                name AS name,
                COALESCE(category, '') AS category,
                COALESCE(notes, '') AS notes,
                service_interval_km AS serviceIntervalKm,
                COALESCE(service_warn_km, 0) AS serviceWarnKm,
                COALESCE(service_start_km, 0) AS serviceStartKm,
                COALESCE(is_active, 1) AS isActive,
                COALESCE(created_at, 0) AS createdAt,
                COALESCE(updated_at, 0) AS updatedAt
            FROM equipment
            WHERE profile = ? AND equipment_id = ?
            LIMIT 1
        `, [profile, normalizedId]);

        return row ? this.mapEquipmentRow(row) : null;
    }

    async listEquipment(profile) {
        const rows = await this.queryAll(`
            SELECT
                equipment_id AS equipmentId,
                profile AS profile,
                name AS name,
                COALESCE(category, '') AS category,
                COALESCE(notes, '') AS notes,
                service_interval_km AS serviceIntervalKm,
                COALESCE(service_warn_km, 0) AS serviceWarnKm,
                COALESCE(service_start_km, 0) AS serviceStartKm,
                COALESCE(is_active, 1) AS isActive,
                COALESCE(created_at, 0) AS createdAt,
                COALESCE(updated_at, 0) AS updatedAt
            FROM equipment
            WHERE profile = ?
            ORDER BY COALESCE(is_active, 1) DESC, COALESCE(updated_at, 0) DESC, name ASC
        `, [profile]);

        return rows.map((row) => this.mapEquipmentRow(row));
    }

    async saveEquipment(profile, payload = {}, equipmentId = null) {
        const equipment = this.normalizeEquipmentPayload(payload, { requireName: true });
        const updatedAt = Date.now();
        const normalizedId = Number.parseInt(equipmentId, 10);

        if (Number.isInteger(normalizedId) && normalizedId > 0) {
            let affectedRows = 0;
            await this.withWrite((db) => {
                db.run(`
                    UPDATE equipment
                    SET
                        name = ?,
                        category = ?,
                        notes = ?,
                        service_interval_km = ?,
                        service_warn_km = ?,
                        service_start_km = ?,
                        is_active = ?,
                        updated_at = ?
                    WHERE profile = ? AND equipment_id = ?
                `, [
                    equipment.name,
                    equipment.category,
                    equipment.notes,
                    equipment.serviceIntervalKm,
                    equipment.serviceWarnKm,
                    equipment.serviceStartKm,
                    equipment.isActive ? 1 : 0,
                    updatedAt,
                    profile,
                    normalizedId
                ]);

                const changesStmt = db.prepare('SELECT changes() AS changes');
                if (changesStmt.step()) {
                    const row = changesStmt.getAsObject();
                    affectedRows = Number(row.changes) || 0;
                }
                changesStmt.free();
            });

            if (affectedRows <= 0) {
                return null;
            }

            return this.getEquipment(profile, normalizedId);
        }

        let insertedId = 0;
        await this.withWrite((db) => {
            db.run(`
                INSERT INTO equipment (
                    profile,
                    name,
                    category,
                    notes,
                    service_interval_km,
                    service_warn_km,
                    service_start_km,
                    is_active,
                    created_at,
                    updated_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                profile,
                equipment.name,
                equipment.category,
                equipment.notes,
                equipment.serviceIntervalKm,
                equipment.serviceWarnKm,
                equipment.serviceStartKm,
                equipment.isActive ? 1 : 0,
                updatedAt,
                updatedAt
            ]);

            const idStmt = db.prepare('SELECT last_insert_rowid() AS id');
            if (idStmt.step()) {
                const row = idStmt.getAsObject();
                insertedId = Number(row.id) || 0;
            }
            idStmt.free();
        });

        return this.getEquipment(profile, insertedId);
    }

    async removeEquipment(profile, equipmentId) {
        const normalizedId = Number.parseInt(equipmentId, 10);
        if (!Number.isInteger(normalizedId) || normalizedId <= 0) {
            return false;
        }

        let affectedRows = 0;
        await this.withWrite((db) => {
            db.run(`
                DELETE FROM equipment
                WHERE profile = ? AND equipment_id = ?
            `, [profile, normalizedId]);

            const changesStmt = db.prepare('SELECT changes() AS changes');
            if (changesStmt.step()) {
                const row = changesStmt.getAsObject();
                affectedRows = Number(row.changes) || 0;
            }
            changesStmt.free();
        });

        return affectedRows > 0;
    }

    async getActivityEquipmentAssignment(profile, filename) {
        await this.upsertActivity(profile, filename);

        const row = await this.queryOne(`
            SELECT
                a.activity_id AS activityId,
                a.filename AS filename,
                e.equipment_id AS equipmentId,
                COALESCE(e.name, '') AS equipmentName,
                COALESCE(x.assigned_at, 0) AS assignedAt
            FROM activities a
            LEFT JOIN activity_equipment_assignments x ON x.activity_id = a.activity_id
            LEFT JOIN equipment e ON e.equipment_id = x.equipment_id
            WHERE a.profile = ? AND a.filename = ?
            LIMIT 1
        `, [profile, filename]);

        if (!row) {
            return this.mapActivityEquipmentAssignmentRow(null, filename);
        }

        return this.mapActivityEquipmentAssignmentRow(row, filename);
    }

    async listActivityEquipmentAssignments(profile) {
        const rows = await this.queryAll(`
            SELECT
                a.activity_id AS activityId,
                a.filename AS filename,
                e.equipment_id AS equipmentId,
                COALESCE(e.name, '') AS equipmentName,
                COALESCE(x.assigned_at, 0) AS assignedAt
            FROM activity_equipment_assignments x
            INNER JOIN activities a ON a.activity_id = x.activity_id
            INNER JOIN equipment e ON e.equipment_id = x.equipment_id
            WHERE a.profile = ?
            ORDER BY COALESCE(x.assigned_at, 0) DESC, a.filename ASC
        `, [profile]);

        return rows.map((row) => this.mapActivityEquipmentAssignmentRow(row, row.filename));
    }

    async setActivityEquipmentAssignment(profile, filename, equipmentId = null) {
        const activityId = await this.upsertActivity(profile, filename);

        if (equipmentId === null || equipmentId === undefined || equipmentId === '') {
            await this.withWrite((db) => {
                db.run('DELETE FROM activity_equipment_assignments WHERE activity_id = ?', [activityId]);
            });

            return this.getActivityEquipmentAssignment(profile, filename);
        }

        const normalizedEquipmentId = Number.parseInt(equipmentId, 10);
        if (!Number.isInteger(normalizedEquipmentId) || normalizedEquipmentId <= 0) {
            throw new Error('equipmentId is invalid');
        }

        const equipment = await this.getEquipment(profile, normalizedEquipmentId);
        if (!equipment) {
            throw new Error('equipment not found');
        }

        const assignedAt = Date.now();
        await this.withWrite((db) => {
            db.run(`
                INSERT INTO activity_equipment_assignments (
                    activity_id,
                    equipment_id,
                    assigned_at
                )
                VALUES (?, ?, ?)
                ON CONFLICT(activity_id)
                DO UPDATE SET
                    equipment_id = excluded.equipment_id,
                    assigned_at = excluded.assigned_at
            `, [activityId, normalizedEquipmentId, assignedAt]);
        });

        return this.getActivityEquipmentAssignment(profile, filename);
    }

    async removeActivity(profile, filename) {
        await this.withWrite((db) => {
            db.run('DELETE FROM activities WHERE profile = ? AND filename = ?', [profile, filename]);
        });
    }

    async removeActivitiesForProfile(profile) {
        await this.withWrite((db) => {
            db.run('DELETE FROM activities WHERE profile = ?', [profile]);
        });
    }

    async upsertWorkout(workout = {}) {
        const now = Date.now();
        const {
            id = null,
            date,
            type,
            duration_sec = null,
            distance_km = null,
            elevation_gain_m = null,
            avg_speed = null,
            max_speed = null,
            avg_hr = null,
            max_hr = null,
            avg_power = null,
            max_power = null,
            avg_cadence = null,
            vertical_oscillation = null,
            ground_contact_time = null,
            trimp = null,
            tss = null,
            hr_recovery = null
        } = workout;

        if (!date || !type) {
            throw new Error('Workout requires date and type');
        }

        await this.withWrite((db) => {
            if (id && Number.isInteger(Number(id))) {
                db.run(`
                    INSERT INTO workouts (
                        id, date, type, duration_sec, distance_km, elevation_gain_m,
                        avg_speed, max_speed, avg_hr, max_hr, avg_power, max_power,
                        avg_cadence, vertical_oscillation, ground_contact_time,
                        trimp, tss, hr_recovery, created_at, updated_at
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT(id) DO UPDATE SET
                        date = excluded.date,
                        type = excluded.type,
                        duration_sec = excluded.duration_sec,
                        distance_km = excluded.distance_km,
                        elevation_gain_m = excluded.elevation_gain_m,
                        avg_speed = excluded.avg_speed,
                        max_speed = excluded.max_speed,
                        avg_hr = excluded.avg_hr,
                        max_hr = excluded.max_hr,
                        avg_power = excluded.avg_power,
                        max_power = excluded.max_power,
                        avg_cadence = excluded.avg_cadence,
                        vertical_oscillation = excluded.vertical_oscillation,
                        ground_contact_time = excluded.ground_contact_time,
                        trimp = excluded.trimp,
                        tss = excluded.tss,
                        hr_recovery = excluded.hr_recovery,
                        updated_at = ?
                `, [
                    id, date, type, duration_sec, distance_km, elevation_gain_m,
                    avg_speed, max_speed, avg_hr, max_hr, avg_power, max_power,
                    avg_cadence, vertical_oscillation, ground_contact_time,
                    trimp, tss, hr_recovery, now, now
                ]);
            } else {
                db.run(`
                    INSERT INTO workouts (
                        date, type, duration_sec, distance_km, elevation_gain_m,
                        avg_speed, max_speed, avg_hr, max_hr, avg_power, max_power,
                        avg_cadence, vertical_oscillation, ground_contact_time,
                        trimp, tss, hr_recovery, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                    date, type, duration_sec, distance_km, elevation_gain_m,
                    avg_speed, max_speed, avg_hr, max_hr, avg_power, max_power,
                    avg_cadence, vertical_oscillation, ground_contact_time,
                    trimp, tss, hr_recovery, now, now
                ]);
            }
        });

        const row = await this.queryOne('SELECT * FROM workouts WHERE date = ? AND type = ? ORDER BY id DESC LIMIT 1', [date, type]);
        return row;
    }

    async insertHrZones(workoutId, zones = {}) {
        if (!workoutId || !Number.isInteger(Number(workoutId))) {
            throw new Error('workoutId is required');
        }

        const now = Date.now();
        const {
            z0_sec = 0,
            z1_sec = 0,
            z2_sec = 0,
            z3_sec = 0,
            z4_sec = 0,
            z5_sec = 0
        } = zones;

        await this.withWrite((db) => {
            db.run(`
                INSERT INTO hr_zones (workout_id, z0_sec, z1_sec, z2_sec, z3_sec, z4_sec, z5_sec, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(workout_id) DO UPDATE SET
                    z0_sec = excluded.z0_sec,
                    z1_sec = excluded.z1_sec,
                    z2_sec = excluded.z2_sec,
                    z3_sec = excluded.z3_sec,
                    z4_sec = excluded.z4_sec,
                    z5_sec = excluded.z5_sec,
                    updated_at = excluded.updated_at
            `, [workoutId, z0_sec, z1_sec, z2_sec, z3_sec, z4_sec, z5_sec, now, now]);
        });

        return this.queryOne('SELECT * FROM hr_zones WHERE workout_id = ?', [workoutId]);
    }

    async upsertHealthMetric(metric = {}) {
        const now = Date.now();
        const {
            date,
            resting_hr = null,
            hrv_ms = null,
            vo2_max = null,
            respiratory_rate = null,
            spo2 = null,
            wrist_temp = null,
            sleep_duration_min = null,
            sleep_quality_pct = null,
            body_battery = null,
            stress_score = null,
            weight_kg = null,
            body_fat_pct = null,
            lean_mass_kg = null
        } = metric;

        if (!date) {
            throw new Error('Health metric requires date');
        }

        await this.withWrite((db) => {
            db.run(`
                INSERT INTO health_metrics (
                    date, resting_hr, hrv_ms, vo2_max, respiratory_rate, spo2,
                    wrist_temp, sleep_duration_min, sleep_quality_pct, body_battery,
                    stress_score, weight_kg, body_fat_pct, lean_mass_kg, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(date) DO UPDATE SET
                    resting_hr = excluded.resting_hr,
                    hrv_ms = excluded.hrv_ms,
                    vo2_max = excluded.vo2_max,
                    respiratory_rate = excluded.respiratory_rate,
                    spo2 = excluded.spo2,
                    wrist_temp = excluded.wrist_temp,
                    sleep_duration_min = excluded.sleep_duration_min,
                    sleep_quality_pct = excluded.sleep_quality_pct,
                    body_battery = excluded.body_battery,
                    stress_score = excluded.stress_score,
                    weight_kg = excluded.weight_kg,
                    body_fat_pct = excluded.body_fat_pct,
                    lean_mass_kg = excluded.lean_mass_kg,
                    updated_at = excluded.updated_at
            `, [
                date, resting_hr, hrv_ms, vo2_max, respiratory_rate, spo2,
                wrist_temp, sleep_duration_min, sleep_quality_pct, body_battery,
                stress_score, weight_kg, body_fat_pct, lean_mass_kg, now
            ]);
        });

        return this.queryOne('SELECT * FROM health_metrics WHERE date = ?', [date]);
    }

    async listWorkouts({ startDate = null, endDate = null } = {}) {
        const conditions = [];
        const params = [];

        if (startDate) {
            conditions.push('date >= ?');
            params.push(startDate);
        }

        if (endDate) {
            conditions.push('date <= ?');
            params.push(endDate);
        }

        const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

        return this.queryAll(`SELECT * FROM workouts ${whereClause} ORDER BY date ASC`, params);
    }

    async getWorkoutById(workoutId) {
        if (!workoutId) {
            return null;
        }
        return this.queryOne('SELECT * FROM workouts WHERE id = ?', [workoutId]);
    }

    async listHealthMetrics({ startDate = null, endDate = null } = {}) {
        const conditions = [];
        const params = [];

        if (startDate) {
            conditions.push('date >= ?');
            params.push(startDate);
        }

        if (endDate) {
            conditions.push('date <= ?');
            params.push(endDate);
        }

        const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
        return this.queryAll(`SELECT * FROM health_metrics ${whereClause} ORDER BY date ASC`, params);
    }

    async getHrZonesForWorkout(workoutId) {
        if (!workoutId) {
            return null;
        }
        return this.queryOne('SELECT * FROM hr_zones WHERE workout_id = ?', [workoutId]);
    }

    async upsertHealthSteps(date, steps) {
        const now = Date.now();
        await this.withWrite((db) => {
            db.run(`
                INSERT INTO health_steps (date, steps, updated_at)
                VALUES (?, ?, ?)
                ON CONFLICT(date)
                DO UPDATE SET steps = excluded.steps, updated_at = excluded.updated_at
            `, [date, steps, now]);
        });
    }

    async getHealthSteps(limit = 30) {
        const rows = await this.queryAll(`
            SELECT date, steps
            FROM health_steps
            ORDER BY date DESC
            LIMIT ?
        `, [limit]);
        return rows.reverse();
    }

    async getHealthStats() {
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];
        
        const last7Days = await this.queryAll(`
            SELECT AVG(steps) as avg_steps
            FROM (
                SELECT steps FROM health_steps
                ORDER BY date DESC
                LIMIT 7
            )
        `);

        const record = await this.queryOne(`
            SELECT date, steps
            FROM health_steps
            ORDER BY steps DESC
            LIMIT 1
        `);

        const total = await this.queryOne(`
            SELECT SUM(steps) as total_steps
            FROM health_steps
        `);

        const todayStepsRow = await this.queryOne(`
            SELECT steps FROM health_steps WHERE date = ?
        `, [todayStr]);

        return {
            today: todayStepsRow ? todayStepsRow.steps : 0,
            avg7Days: last7Days[0]?.avg_steps ? Math.round(Number(last7Days[0].avg_steps)) : 0,
            record: record ? { date: record.date, steps: record.steps } : null,
            total: total?.total_steps ? Number(total.total_steps) : 0
        };
    }

    async listAllHealthSteps() {
        return this.queryAll(`
            SELECT date, steps
            FROM health_steps
            ORDER BY date ASC
        `);
    }
}

module.exports = { MetadataStore };
