#!/usr/bin/env node
/**
 * generate-license.js — Gerador de chaves de licença para o Totem
 *
 * Uso:
 *   node scripts/generate-license.js --id TV-01 --days 30
 *   node scripts/generate-license.js --id TV-02 --days 7
 *   node scripts/generate-license.js --id TV-03 --days 3
 *   node scripts/generate-license.js --id TV-03 --days 5
 *   node scripts/generate-license.js --id TESTE --minutes 5
 *
 * Opções de --days: 1 | 2 | 3 | 5 | 7 | 30
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
// Altere para um valor único e secreto antes de distribuir.
const SECRET = 'TOTEM_CNDL_SECRET_2026_#@!';
// ─────────────────────────────────────────────────────────────────────────────

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = resolve(__dirname, '../public/license.key');

const VALID_DAYS = [1, 2, 3, 5, 7, 30];

function parseArgs() {
  const args = process.argv.slice(2);
  const result = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--id'   && args[i + 1]) { result.id   = args[i + 1]; i++; }
    if (args[i] === '--days' && args[i + 1]) { result.days = parseInt(args[i + 1], 10); i++; }
    if (args[i] === '--minutes' && args[i + 1]) { result.minutes = parseInt(args[i + 1], 10); i++; }
    if (args[i] === '--out'  && args[i + 1]) { result.out  = args[i + 1]; i++; }
  }
  return result;
}

function generateHash(id, expireAt) {
  return createHash('sha256')
    .update(`${id}|${expireAt}|${SECRET}`)
    .digest('hex');
}

function main() {
  const args = parseArgs();

  if (!args.id) {
    console.error('Erro: --id é obrigatório. Ex: --id TV-01');
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

  const now       = new Date();
  const expireAt  = args.minutes 
                    ? new Date(now.getTime() + args.minutes * 60 * 1000)
                    : new Date(now.getTime() + args.days * 24 * 60 * 60 * 1000);
  const expireISO = expireAt.toISOString();
  const hash      = generateHash(args.id, expireISO);

  const payload = {
    id:       args.id,
    expireAt: expireISO,
    days:     args.days || 0,
    minutes:  args.minutes || 0,
    issuedAt: now.toISOString(),
    hash,
  };

  const encoded  = Buffer.from(JSON.stringify(payload)).toString('base64');
  const outPath  = args.out ? resolve(args.out) : OUTPUT_PATH;

  writeFileSync(outPath, encoded, 'utf-8');

  console.log('\n✅  Licença gerada com sucesso!');
  console.log(`   ID do Totem : ${args.id}`);
  console.log(`   Emitida em  : ${now.toLocaleString('pt-BR')}`);
  console.log(`   Expira em   : ${expireAt.toLocaleString('pt-BR')} (${args.minutes ? args.minutes + ' minutos' : args.days + ' dias'})`);
  console.log(`   Salva em    : ${outPath}`);
  console.log('\n   Inclua o arquivo public/license.key no build antes de instalar no dispositivo.\n');
}

main();
