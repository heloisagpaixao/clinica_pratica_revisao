require("dotenv").config();
const fs = require("fs");
const path = require("path");
const express = require("express");
const mysql = require("mysql2/promise");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const cookieparser = require("cookie-parser");
const Mustache = require("mustache");

const app = express();
app.use(express.urlencoded({ extended: false }));
app.use(cookieparser());

app.use((req, res, next) => {
  const metodo = String(req.body?._method || "").toUpperCase();
  if (req.method === "POST" && ["PUT", "DELETE"].includes(metodo)) {
    req.method = metodo;
  }
  next();
});

const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  dateStrings: true,
});

// =================================== FUNÇÕES INICIAIS =================================== //
function mostrar(nome, dados = {}) {
  const arquivo = path.join(__dirname, "paginas", `${nome}.html`);
  return Mustache.render(fs.readFileSync(arquivo, "utf-8"), dados);
}

function criptografar(texto) {
  const cifra = crypto.createCipheriv(
    "aes-256-cbc",
    process.env.CRIPTO_CHAVE,
    process.env.CRIPTO_IV,
  );
  return cifra.update(texto, "utf-8", "hex") + cifra.final("hex");
}

function descriptografar(texto) {
  const decifra = crypto.createDecipheriv(
    "aes-256-cbc",
    process.env.CRIPTO_CHAVE,
    process.env.CRIPTO_IV,
  );
  return decifra.update(texto, "hex", "utf-8") + decifra.final("utf-8");
}

async function excluir(res, tabela, id, volta, motivo) {
  try {
    await db.query(`DELETE FROM ${tabela} WHERE id = ?`, [id]);
    res.redirect(volta);
  } catch (erro) {
    if (erro.code === "ER_ROW_IS_REFERENCED_2") {
      return res
        .status(409)
        .send(
          `<p> Não foi possível excluir: ${motivo} </p> <p><a href="${volta}"> Voltar </a> </p>`,
        );
    }
    console.error(erro);
    res
      .status(500)
      .send(
        `<p> Erro ao excluir. </p> <p><a href="${volta}"> Voltar </a> </p>`,
      );
  }
}

async function mostrarPlanos(req, res, erro = "") {
  const [planos] = await db.query("SELECT * FROM plano_de_tratamento");
  const [listaPacientes] = await db.query("SELECT id, nome FROM pacientes");
  const editar = planos.find((p) => String(p.id) === req.query.editar);

  const pacientes = listaPacientes.map((paciente) => ({
    ...paciente,
    selecionado: editar && paciente.id === editar.paciente_id ? "selected" : "",
  }));

  res.send(
    mostrar("planos", {
      planos,
      pacientes,
      erro,
      editando: Boolean(editar),
      acao: editar ? `/planos/${editar.id}` : "/planos",
      form: editar || {},
    }),
  );
}

// =================================== LOGIN =================================== //
app.get("/", (req, res) => res.send(mostrar("login")));
app.post("/login", async (req, res) => {
  const { email, senha } = req.body;
  const [usuarios] = await db.query("SELECT * FROM usuarios WHERE email = ?", [
    email,
  ]);
  const usuario = usuarios[0];

  if (!usuario || !(await bcrypt.compare(senha, usuario.senha))) {
    return res.send(mostrar("login", { erro: "E-mail ou senha inválidos." }));
  }
  const token = jwt.sign(
    { id: usuario.id, nome: usuario.nome },
    process.env.JWT_SECRET,
    { expiresIn: "1h" },
  );

  res.cookie("token", token, { httpOnly: true });
  res.redirect("/principal");
});

app.post("/sair", (req, res) => {
  res.clearCookie("token");
  res.redirect("/");
});

app.use((req, res, next) => {
  try {
    req.usuario = jwt.verify(req.cookies.token, process.env.JWT_SECRET);
    next();
  } catch (erro) {
    res.redirect("/");
  }
});

app.get("/principal", (req, res) =>
  res.send(mostrar("principal", { nome: req.usuario.nome })),
);

// =================================== PACIENTES =================================== //
app.get("/pacientes", async (req, res) => {
  const busca = req.query.busca || "";
  const [lista] = await db.query("SELECT * FROM pacientes WHERE nome LIKE ?", [
    `%${busca}%`,
  ]);
  const pacientes = lista.map((paciente) => ({
    ...paciente,
    cpf: descriptografar(paciente.cpf),
  }));

  const editar = pacientes.find(
    (paciente) => String(paciente.id) === req.query.editar,
  );

  res.send(
    mostrar("pacientes", {
      busca,
      pacientes,
      editando: Boolean(editar),
      acao: editar ? `/pacientes/${editar.id}` : "/pacientes",
      form: editar || {},
    }),
  );
});

app.post("/pacientes", async (req, res) => {
  const { nome, cpf, telefone, email } = req.body;
  await db.query(
    "INSERT INTO pacientes (nome, cpf, telefone, email) VALUES (?, ?, ?, ?)",
    [nome, criptografar(cpf), telefone, email],
  );
  res.redirect("/pacientes");
});

app.put("/pacientes/:id", async (req, res) => {
  const { nome, cpf, telefone, email } = req.body;
  await db.query(
    "UPDATE pacientes SET nome = ?, cpf = ?, telefone = ?, email = ? WHERE id = ?",
    [nome, criptografar(cpf), telefone, email, req.params.id],
  );
  res.redirect("/pacientes");
});

app.delete("/pacientes/:id", async (req, res) => {
  await excluir(
    res,
    "pacientes",
    req.params.id,
    "/pacientes",
    "O paciente já possuí planos cadastrados.",
  );
});

// =================================== PLANOS DE TRATAMENTO =================================== //
app.get("/planos", (req, res) => mostrarPlanos(req, res));

app.post("/planos", async (req, res) => {
  const {
    paciente_id,
    diagnostico,
    exercicios,
    resultado_esperado,
    avaliacao,
  } = req.body;
  if (!paciente_id) {
    return mostrar(req, res, "Paciente ID é obrigatório.");
  }
  await db.query(
    "INSERT INTO plano_de_tratamento (paciente_id, diagnostico, exercicios, resultado_esperado, avaliacao) VALUES (?, ?, ?, ?, ?)",
    [
      paciente_id,
      diagnostico,
      exercicios,
      resultado_esperado,
      avaliacao || null,
    ],
  );
  res.redirect("/planos");
});

app.put("/planos/:id", async (req, res) => {
  const {
    paciente_id,
    diagnostico,
    exercicios,
    resultado_esperado,
    avaliacao,
  } = req.body;

  if (!paciente_id)
    return mostrarPlanos(req, res, "ID do paciente é obrigatório.");

  await db.query(
    "UPDATE plano_de_tratamento SET paciente_id = ?, diagnostico = ?, exercicios = ?, resultado_esperado = ?, avaliacao = ? WHERE id = ?",
    [
      paciente_id,
      diagnostico,
      exercicios,
      resultado_esperado,
      avaliacao || null,
      req.params.id,
    ],
  );
  res.redirect("/planos");
});

app.delete("/planos/:id", async (req, res) => {
  await excluir(
    res,
    "plano_de_tratamento",
    req.params.id,
    "/planos",
    "O plano possui sessões.",
  );
});

// =================================== SESSÕES =================================== //
app.get("/sessoes", async (req, res) => {
  const [lista] = await db.query(
    `SELECT sessoes.*, plano_de_tratamento.diagnostico, pacientes.nome AS paciente_nome
     FROM sessoes
     JOIN plano_de_tratamento ON plano_de_tratamento.id = sessoes.plano_id
     JOIN pacientes ON pacientes.id = plano_de_tratamento.paciente_id
     ORDER BY sessoes.data_sessao`,
  );

  const [planos] = await db.query("SELECT * FROM plano_de_tratamento");

  const sessoes = lista.map((s) => ({
    ...s,
    data_br: new Date(s.data_sessao).toLocaleString("pt-BR"),
    data_input: s.data_sessao.slice(0, 16).replace(" ", "T"),
  }));

  res.send(mostrar("sessoes", { sessoes, planos }));
});

app.post("/sessoes", async (req, res) => {
  const { plano_id, data_sessao, exercicios } = req.body;

  await db.query(
    "INSERT INTO sessoes (plano_id, data_sessao, exercicios) VALUES (?, ?, ?)",
    [plano_id, data_sessao.replace("T", " "), exercicios],
  );
  res.redirect("/sessoes");
});

app.put("/sessoes/:id", async (req, res) => {
  await db.query("UPDATE sessoes SET data_sessao = ? WHERE id = ?", [
    req.body.data_sessao.replace("T", " "),
    req.params.id,
  ]);
  res.redirect("/sessoes");
});

app.delete("/sessoes/:id", async (req, res) => {
  await excluir(res, "sessoes", req.params.id, "/sessoes", " ");
});

// =================================== BANCO DE DADOS =================================== //
const porta = process.env.PORT || 3000;
app.listen(porta, () =>
  console.log(`Clínica rodando em http://localhost:${porta}`),
);
