// update-prices.js
// Запускается GitHub Actions раз в день. Обновляет цены в prices.json.

const fs = require('fs');
const path = require('path');

// Источник: публичный JSON от LiteLLM (обновляется сообществом ежедневно)
const SOURCE_URL = 'https://raw.githubusercontent.com/BerriAI/litellm/main/model_prices_and_context_window.json';

// Какие модели нам нужны: ключ в нашем файле → ключ в LiteLLM
const MODELS_TO_TRACK = {
  'gpt-4.1':          { litellm: 'gpt-4.1',                    name: 'GPT-4.1',         color: '#00d26a' },
  'gpt-4o-mini':      { litellm: 'gpt-4o-mini',                name: 'GPT-4o mini',     color: '#00d26a' },
  'claude-sonnet-5':  { litellm: 'claude-sonnet-4-5',          name: 'Claude Sonnet 5', color: '#d97757' },
  'claude-opus-5':    { litellm: 'claude-opus-4-5',            name: 'Claude Opus 5',   color: '#d97757' },
  'gemini-2.5-pro':   { litellm: 'gemini/gemini-2.5-pro',      name: 'Gemini 2.5 Pro',  color: '#4285f4' },
  'deepseek-v4':      { litellm: 'deepseek/deepseek-chat',     name: 'DeepSeek V4',     color: '#5b6ee1' },
};

// Курс доллара к рублю
const USD_TO_RUB = 92;

async function fetchPrices() {
  console.log('Загружаю свежие цены с LiteLLM...');
  const res = await fetch(SOURCE_URL);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json();
}

function convertToOurFormat(litellmData) {
  const models = {};

  for (const [ourKey, meta] of Object.entries(MODELS_TO_TRACK)) {
    const src = litellmData[meta.litellm];

    if (!src) {
      console.warn(`Модель не найдена: ${meta.litellm}`);
      continue;
    }

    const inPerMillion  = (src.input_cost_per_token  || 0) * 1000000;
    const outPerMillion = (src.output_cost_per_token || 0) * 1000000;

    models[ourKey] = {
      name: meta.name,
      in:  Math.round(inPerMillion  * 10000) / 10000,
      out: Math.round(outPerMillion * 10000) / 10000,
      color: meta.color,
    };

    console.log(`  OK ${meta.name}: $${models[ourKey].in} / $${models[ourKey].out}`);
  }

  return models;
}

async function main() {
  try {
    const litellmData = await fetchPrices();
    const models = convertToOurFormat(litellmData);

    const output = {
      updated: new Date().toISOString(),
      usd_to_rub: USD_TO_RUB,
      models,
    };

    const outPath = path.join(__dirname, 'prices.json');
    fs.writeFileSync(outPath, JSON.stringify(output, null, 2) + '\n');

    console.log(`\nprices.json обновлен: ${Object.keys(models).length} моделей`);
  } catch (err) {
    console.error('Ошибка:', err.message);
    process.exit(1);
  }
}

main();
