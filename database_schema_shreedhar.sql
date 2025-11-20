CREATE TABLE users (
	id INTEGER NOT NULL, 
	username VARCHAR NOT NULL, 
	email VARCHAR NOT NULL, 
	hashed_password VARCHAR NOT NULL, 
	role VARCHAR(12) NOT NULL, 
	is_active BOOLEAN, 
	created_at DATETIME, 
	PRIMARY KEY (id)
);
CREATE UNIQUE INDEX ix_users_username ON users (username);
CREATE INDEX ix_users_id ON users (id);
CREATE UNIQUE INDEX ix_users_email ON users (email);
CREATE TABLE opds (
	id INTEGER NOT NULL, 
	opd_code VARCHAR NOT NULL, 
	opd_name VARCHAR NOT NULL, 
	description VARCHAR, 
	is_active BOOLEAN, 
	created_at DATETIME, 
	updated_at DATETIME, 
	PRIMARY KEY (id)
);
CREATE INDEX ix_opds_id ON opds (id);
CREATE UNIQUE INDEX ix_opds_opd_code ON opds (opd_code);
CREATE TABLE rooms (
	id INTEGER NOT NULL, 
	room_number VARCHAR NOT NULL, 
	room_name VARCHAR NOT NULL, 
	room_type VARCHAR NOT NULL, 
	is_active BOOLEAN, 
	created_at DATETIME, 
	PRIMARY KEY (id)
);
CREATE UNIQUE INDEX ix_rooms_room_number ON rooms (room_number);
CREATE INDEX ix_rooms_id ON rooms (id);
CREATE TABLE patients (
	id INTEGER NOT NULL, 
	registration_number VARCHAR, 
	token_number VARCHAR NOT NULL, 
	name VARCHAR NOT NULL, 
	age INTEGER, 
	phone VARCHAR, 
	registration_time DATETIME, 
	current_status VARCHAR(9), 
	allocated_opd VARCHAR, 
	current_room VARCHAR, 
	is_dilated BOOLEAN, 
	dilation_time DATETIME, 
	referred_from VARCHAR, 
	referred_to VARCHAR, 
	completed_at DATETIME, 
	PRIMARY KEY (id)
);
CREATE INDEX ix_patients_id ON patients (id);
CREATE INDEX ix_patients_registration_number ON patients (registration_number);
CREATE UNIQUE INDEX ix_patients_token_number ON patients (token_number);
CREATE TABLE queues (
	id INTEGER NOT NULL, 
	opd_type VARCHAR NOT NULL, 
	patient_id INTEGER NOT NULL, 
	position INTEGER NOT NULL, 
	status VARCHAR(9), 
	created_at DATETIME, 
	updated_at DATETIME, 
	PRIMARY KEY (id), 
	FOREIGN KEY(patient_id) REFERENCES patients (id)
);
CREATE INDEX ix_queues_id ON queues (id);
CREATE TABLE patient_flows (
	id INTEGER NOT NULL, 
	patient_id INTEGER NOT NULL, 
	from_room VARCHAR, 
	to_room VARCHAR, 
	status VARCHAR(9) NOT NULL, 
	timestamp DATETIME, 
	notes VARCHAR, 
	PRIMARY KEY (id), 
	FOREIGN KEY(patient_id) REFERENCES patients (id)
);
CREATE INDEX ix_patient_flows_id ON patient_flows (id);
CREATE TABLE user_opd_access (
	id INTEGER NOT NULL, 
	user_id INTEGER NOT NULL, 
	opd_code VARCHAR NOT NULL, 
	created_at DATETIME, 
	PRIMARY KEY (id), 
	FOREIGN KEY(user_id) REFERENCES users (id)
);
CREATE INDEX ix_user_opd_access_id ON user_opd_access (id);
