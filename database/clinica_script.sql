CREATE DATABASE IF NOT EXISTS clinica;
USE clinica;

CREATE TABLE usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    senha VARCHAR(255) NOT NULL
);

CREATE TABLE pacientes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    cpf VARCHAR(255) NOT NULL,
    telefone VARCHAR(20),
    email VARCHAR (100)
);

CREATE TABLE plano_de_tratamento (
    id INT AUTO_INCREMENT PRIMARY KEY,
    paciente_id INT NOT NULL,
    diagnostico VARCHAR(50) NOT NULL,
    exercicios VARCHAR(50),
    resultado_esperado VARCHAR(50),
    avaliacao VARCHAR(50),
    FOREIGN KEY (paciente_id) REFERENCES pacientes(id)
);

CREATE TABLE sessoes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    plano_id INT NOT NULL,
    data_sessao DATETIME NOT NULL,
    exercicios VARCHAR(100),
    FOREIGN KEY (plano_id) REFERENCES plano_de_tratamento(id)
);

INSERT INTO usuarios (nome, email, senha) VALUES
("Administrador", "admin@clinica.com", "$2b$10$RLJXYpsTA/Y8WdDAV/Awxu1Bot2G6jFVpHQ06M3cph9puBeFEkB0q"),
("Flora Fisioterapeuta", "flora@clinica.com", "$2b$10$RLJXYpsTA/Y8WdDAV/Awxu1Bot2G6jFVpHQ06M3cph9puBeFEkB0q"),
("Márcio Enfermeiro", "marcio@clinica.com", "$2b$10$RLJXYpsTA/Y8WdDAV/Awxu1Bot2G6jFVpHQ06M3cph9puBeFEkB0q");

INSERT INTO pacientes (nome, cpf, telefone, email) VALUES
("João da Silva", "b9332f3140efaf757e4d684975ef3365", "(11)95729-0221", "joao.silva@email.com"),
("Maria Souza", "be4f639df4cd927594a5e3084b540dc1", "(11)95101-6804", "maria.souza@email.com"),
("Pedro Oliveira", "65eea67226931d6bc95e431330183923", "(11)97376-9638", "pedro.oliveira@email.com");

INSERT INTO plano_de_tratamento (paciente_id, diagnostico, exercicios, resultado_esperado, avaliacao) VALUES 
(1, 'Lombalgia crônica', 'Alongamento lombar e fortalecimento de core', 'Redução da dor em 80%', 'Melhora gradual da mobilidade'),
(2, 'Tendinite no ombro direito', 'Elevação lateral leve e rotação externa', 'Recuperar amplitude de movimento', 'Dor reduzida após 2 semanas'),
(3, 'Entorse de tornozelo grau II', 'Propriocepção e fortalecimento de panturrilha', 'Retorno à corrida sem dor', 'Boa estabilidade articular');

INSERT INTO sessoes (plano_id, data_sessao, exercicios) VALUES 
(1, '2026-11-10 09:00:00', 'Alongamento de isquiotibiais (3x30s) e ponte pélvica (3x12)'),
(2, '2026-11-11 14:30:00', 'Exercício pendular de Codman e isometria de manguito rotador'),
(3, '2026-11-15 16:00:00', 'Equilíbrio unipodal no solo e flexão plantar (3x15)');