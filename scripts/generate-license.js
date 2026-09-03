#!/usr/bin/env node
/**
 * generate-license.js — Gerador de chaves de licença para o Totem
 *
 * Uso recomendado (ativação no primeiro uso no Totem):
 *   node scripts/generate-license.js --id TV-01 --days 30
 *   node scripts/generate-license.js --id TV-02 --days 7
 *   node scripts/generate-license.js --id TV-03 --days 3
 *   node scripts/generate-license.js --id TV-03 --days 5
 *   node scripts/generate-license.js --id TESTE --minutes 5
 *
 * Uso com data fixa (expira a partir do momento da emissão no computador):
 *   node scripts/generate-license.js --id TV-01 --days 30 --fixed
 *
 * O arquivo gerado (public/license.key) deve ser incluído no build do app.
 * NUNCA compartilhe a variável SECRET abaixo.
 */

import { createHash } from 'crypto';
import { writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// ─── SEGREDO COMPARTILHADO ────────────────────────────────────────────────────
// Este segredo deve ser IDÊNTICO ao do arquivo licenseValidator.js no frontend.
const SECRET = 'TOTEM_CNDL_SECRET_2026_#@!';
// ─────────────────────────────────────────────────────────────────────────────

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = resolve(__dirname, '../public/license.key');

const VALID_DAYS = [1, 2, 3, 5, 7, 30];

function parseArgs() {
  const args = process.argv.slice(2);
  const result = { isFixed: false };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--id' && args[i + 1]) { result.id = args[i + 1]; i++; }
    if (args[i] === '--days' && args[i + 1]) { result.days = parseInt(args[i + 1], 10); i++; }
    if (args[i] === '--minutes' && args[i + 1]) { result.minutes = parseInt(args[i + 1], 10); i++; }
    if (args[i] === '--out' && args[i + 1]) { result.out = args[i + 1]; i++; }
    if (args[i] === '--fixed') { result.isFixed = true; }
  }
  return result;
}

function generateFixedHash(id, expireAt) {
  return createHash('sha256')
    .update(`${id}|${expireAt}|${SECRET}`)
    .digest('hex');
}

function generateDynamicHash(id, durationDays, durationMinutes) {
  return createHash('sha256')
    .update(`${id}|dynamic|${durationDays}|${durationMinutes}|${SECRET}`)
    .digest('hex');
}

function main() {
  const args = parseArgs();

  if (!args.id) {
    console.error('Erro: --id e obrigatorio. Ex: --id TV-01');
    process.exit(1);
  }

  if (!args.days && !args.minutes) {
    console.error(`Erro: --days deve ser um dos valores: ${VALID_DAYS.join(', ')} ou use --minutes para testes.`);
    process.exit(1);
  }

  if (args.days && !VALID_DAYS.includes(args.days)) {
    console.error(`Erro: --days deve ser um dos valores: ${VALID_DAYS.join(', ')}`);
    process.exit(1);
  }

  const now = new Date();
  const durationDays = args.days || 0;
  const durationMinutes = args.minutes || 0;

  let payload;

  if (args.isFixed) {
    const expireAt = durationMinutes 
      ? new Date(now.getTime() + durationMinutes * 60 * 1000)
      : new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);
    const expireISO = expireAt.toISOString();
    const hash = generateFixedHash(args.id, expireISO);

    payload = {
      type: 'fixed',
      id: args.id,
      expireAt: expireISO,
      days: durationDays,
      minutes: durationMinutes,
      issuedAt: now.toISOString(),
      hash,
    };
  } else {
    const hash = generateDynamicHash(args.id, durationDays, durationMinutes);

    payload = {
      type: 'dynamic',
      id: args.id,
      durationDays,
      durationMinutes,
      issuedAt: now.toISOString(),
      hash,
    };
  }

  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64');
  const outPath = args.out ? resolve(args.out) : OUTPUT_PATH;

  writeFileSync(outPath, encoded, 'utf-8');

  console.log('\n[OK] Licenca gerada com sucesso!');
  console.log(`   ID do Totem : ${args.id}`);
  console.log(`   Modo        : ${args.isFixed ? 'Data Fixa (a partir da emissao)' : 'Dinamico (a contar da 1a ativacao no totem)'}`);
  console.log(`   Duracao     : ${durationMinutes ? `${durationMinutes} minutos` : `${durationDays} dias`}`);
  console.log(`   Emitida em  : ${now.toLocaleString('pt-BR')}`);
  if (args.isFixed) {
    console.log(`   Expira em   : ${new Date(payload.expireAt).toLocaleString('pt-BR')}`);
  }
  console.log(`   Salva em    : ${outPath}`);
  console.log('\n   Inclua o arquivo public/license.key no build antes de instalar no dispositivo.\n');
}

main();
