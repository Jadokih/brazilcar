/**
 * Script de preparação automática do catálogo de veículos da Brazil Car.
 * Lê as subpastas de `veiculos/` ou `catalogo/`, identifica imagens reais e
 * extrai os dados documentados nos arquivos `.txt` sem inventar informações.
 *
 * Uso: node scripts/gerar-catalogo.js
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const CANDIDATE_DIRS = ['veiculos', 'catalogo'];
const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif']);

/**
 * Identificação visual das fotos reais fornecidas na pasta quando o arquivo .txt
 * não informa a marca explícita ou está vazio (0 bytes).
 * Nenhum dado técnico (ano, câmbio, lugares ou preço) é inventado aqui.
 */
const VISUAL_IMAGE_METADATA = {
  '1': {
    marcaPadrao: 'Hyundai',
    modeloPadrao: 'HB20',
    carroceria: 'Hatch compacto',
    altFoto: 'Hyundai HB20 branco em ângulo frontal três quartos',
    observacaoVisual: 'A fotografia na pasta exibe um Hyundai HB20 branco (placa promocional "HB20 5 anos"), enquanto o arquivo descrição.txt documenta "HB20 2025 / AUTOMÁTICO / 240,00 A DIÁRIA".'
  },
  '2': {
    marcaPadrao: 'Volkswagen',
    modeloPadrao: 'Polo',
    carroceria: 'Hatch compacto',
    altFoto: 'Volkswagen Polo prata em ângulo frontal três quartos',
    observacaoVisual: 'O arquivo DESCRIÇÃO.txt na subpasta 2 está vazio (0 bytes). Pela análise visual da fotografia real fornecida (images.jpg), o veículo é identificado como um Volkswagen Polo (emblema VW e placa "Polo" visíveis). Ano, transmissão e valor de locação foram omitidos por não estarem documentados.'
  }
};

const BRAND_MAP = [
  { regex: /\b(hyundai|hb20|hb20s|creta)\b/i, marca: 'Hyundai' },
  { regex: /\b(volkswagen|vw|polo|gol|voyage|virtus|t-cross|nivus|saveiro)\b/i, marca: 'Volkswagen' },
  { regex: /\b(fiat|argo|mobi|cronos|strada|toro|pulse|fastback|uno|fiorino)\b/i, marca: 'Fiat' },
  { regex: /\b(chevrolet|gm|onix|prisma|tracker|spin|s10|montana)\b/i, marca: 'Chevrolet' },
  { regex: /\b(renault|kwid|sandero|logan|duster|oroch|master)\b/i, marca: 'Renault' },
  { regex: /\b(toyota|corolla|yaris|hilux|etios)\b/i, marca: 'Toyota' },
  { regex: /\b(honda|city|civic|hr-v|fit)\b/i, marca: 'Honda' },
  { regex: /\b(jeep|renegade|compass|commander)\b/i, marca: 'Jeep' },
  { regex: /\b(nissan|kicks|versa|frontier)\b/i, marca: 'Nissan' },
  { regex: /\b(peugeot|208|2008|partner)\b/i, marca: 'Peugeot' },
  { regex: /\b(citro[eë]n|c3|c4)\b/i, marca: 'Citroën' },
  { regex: /\b(byd|dolphin|song|king)\b/i, marca: 'BYD' }
];

function lerTextoComEncodingSeguro(filePath) {
  const buffer = fs.readFileSync(filePath);
  if (buffer.length === 0) return '';
  const utf8 = buffer.toString('utf8');
  if (utf8.includes('\uFFFD')) {
    return buffer.toString('latin1');
  }
  return utf8;
}

function normalizarCaminhoRelativo(fullPath) {
  return path.relative(ROOT_DIR, fullPath).split(path.sep).join('/');
}

function detectarMarca(texto, fallbackMarca) {
  for (const item of BRAND_MAP) {
    if (item.regex.test(texto)) {
      return item.marca;
    }
  }
  return fallbackMarca || null;
}

function extrairDadosTxt(rawText, folderName) {
  const visualMeta = VISUAL_IMAGE_METADATA[folderName] || {};
  const linhas = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (linhas.length === 0) {
    const marca = visualMeta.marcaPadrao || null;
    const modelo = visualMeta.modeloPadrao || `Veículo ${folderName}`;
    const nome = marca && !modelo.toLowerCase().startsWith(marca.toLowerCase())
      ? `${marca} ${modelo}`
      : modelo;

    return {
      nomeExibicao: nome,
      nomeDocumento: null,
      marca,
      modelo,
      versao: null,
      ano: null,
      transmissao: null,
      lugares: null,
      caracteristicasExtras: [],
      precoValor: null,
      precoFormatado: null,
      unidadeCobranca: null,
      textoPrecoOriginal: null,
      dadosIncompletos: true,
      motivoIncompleto: 'Arquivo de descrição (.txt) está vazio (0 bytes). Valor, ano e câmbio sob consulta.'
    };
  }

  // Primeira linha normalmente traz modelo e ano (ex: "HB20 2025")
  const primeiraLinha = linhas[0];
  const textoCompleto = linhas.join(' | ');

  // Ano (4 dígitos entre 1990 e 2030, ou formato 2024/2025)
  const anoMatch = textoCompleto.match(/\b((?:19|20)\d{2}(?:\s*\/\s*(?:19|20)?\d{2})?)\b/);
  const ano = anoMatch ? anoMatch[1].replace(/\s+/g, '') : null;

  // Modelo a partir da primeira linha removendo o ano se estiver nela
  let modeloLimpo = primeiraLinha;
  if (anoMatch) {
    modeloLimpo = modeloLimpo.replace(anoMatch[0], '').trim();
  }
  if (!modeloLimpo) {
    modeloLimpo = visualMeta.modeloPadrao || primeiraLinha;
  }

  const marca = detectarMarca(textoCompleto, visualMeta.marcaPadrao);
  const nomeExibicao =
    marca && !modeloLimpo.toLowerCase().startsWith(marca.toLowerCase())
      ? `${marca} ${modeloLimpo}`
      : modeloLimpo;

  // Transmissão
  let transmissao = null;
  if (/autom[aá]tico|automatico|cvt|at\b/i.test(textoCompleto)) {
    transmissao = 'Automático';
  } else if (/manual|mec[aâ]nico|mecanico/i.test(textoCompleto)) {
    transmissao = 'Manual';
  }

  // Quantidade de lugares (somente se informado no .txt)
  let lugares = null;
  const lugaresMatch = textoCompleto.match(/\b(\d+)\s*lugares\b/i);
  if (lugaresMatch) {
    lugares = `${lugaresMatch[1]} lugares`;
  }

  // Preço e unidade de cobrança
  let precoValor = null;
  let precoFormatado = null;
  let unidadeCobranca = null;
  let textoPrecoOriginal = null;

  for (const linha of linhas) {
    const precoMatch = linha.match(/(?:R\$\s*)?(\d{1,3}(?:\.\d{3})*(?:,\d{2})|\d+(?:,\d{2}))/i);
    if (precoMatch && /di[aá]ria|semanal|semana|mensal|m[eê]s|aluguel|r\$/i.test(linha)) {
      textoPrecoOriginal = linha;
      const valorNumericoStr = precoMatch[1].replace(/\./g, '').replace(',', '.');
      precoValor = parseFloat(valorNumericoStr);
      precoFormatado = `R$ ${precoMatch[1]}`;

      if (/a\s+di[aá]ria|por\s+dia|di[aá]ria/i.test(linha)) {
        unidadeCobranca = 'a diária';
      } else if (/semanal|por\s+semana|semana/i.test(linha)) {
        unidadeCobranca = 'semanal';
      } else if (/mensal|por\s+m[eê]s|m[eê]s/i.test(linha)) {
        unidadeCobranca = 'mensal';
      } else {
        unidadeCobranca = '';
      }
      break;
    }
  }

  // Características extras documentadas além de linha de modelo, transmissão e preço
  const caracteristicasExtras = [];
  linhas.slice(1).forEach((linha) => {
    if (linha === textoPrecoOriginal) return;
    if (/^(autom[aá]tico|automatico|manual|mec[aâ]nico)$/i.test(linha)) return;
    caracteristicasExtras.push(linha);
  });

  return {
    nomeExibicao,
    nomeDocumento: primeiraLinha,
    marca,
    modelo: modeloLimpo,
    versao: null,
    ano,
    transmissao,
    lugares,
    caracteristicasExtras,
    precoValor,
    precoFormatado,
    unidadeCobranca,
    textoPrecoOriginal,
    dadosIncompletos: !precoFormatado || !transmissao || !ano,
    motivoIncompleto: null
  };
}

function classificarCategorias(dados, visualMeta) {
  const categorias = new Set();

  // Transmissão documentada
  if (dados.transmissao === 'Automático') {
    categorias.add('Automáticos');
  } else if (dados.transmissao === 'Manual') {
    categorias.add('Manuais');
  }

  // Atributos objetivos de carroceria / modelo confirmado (HB20 e Polo são hatches compactos econômicos para rotina/trabalho)
  const modeloLower = `${dados.marca || ''} ${dados.modelo || ''}`.toLowerCase();
  const isHatchCompacto = /\b(hb20|polo|onix|argo|mobi|kwid|gol|sandero|208|c3|yaris)\b/.test(modeloLower);

  if (isHatchCompacto) {
    categorias.add('Econômicos');
    categorias.add('Trabalho');
  }

  // Para viagem: incluímos veículos com dados completos confirmados (como HB20 2025 Automático)
  if (!dados.dadosIncompletos && isHatchCompacto) {
    categorias.add('Viagem');
  }

  // Família e Mais espaço somente se documentado 5+ lugares com porta-malas amplo/sedan/SUV/minivan
  if (dados.lugares && parseInt(dados.lugares, 10) >= 7) {
    categorias.add('Família');
    categorias.add('Mais espaço');
  }

  return Array.from(categorias);
}

function escanearCatalogo() {
  const dirEncontrado = CANDIDATE_DIRS
    .map((d) => ({ nome: d, full: path.join(ROOT_DIR, d) }))
    .find((d) => fs.existsSync(d.full) && fs.statSync(d.full).isDirectory());

  if (!dirEncontrado) {
    throw new Error('Nenhuma pasta `veiculos/` ou `catalogo/` encontrada no projeto.');
  }

  const subpastas = fs
    .readdirSync(dirEncontrado.full, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name)
    .sort((a, b) => a.localeCompare(b, 'pt-BR', { numeric: true }));

  const veiculos = [];
  const avisos = [];

  for (const subpasta of subpastas) {
    const subpastaFull = path.join(dirEncontrado.full, subpasta);
    const arquivos = fs.readdirSync(subpastaFull, { withFileTypes: true }).filter((f) => f.isFile());

    const imagens = arquivos
      .filter((f) => IMAGE_EXTENSIONS.has(path.extname(f.name).toLowerCase()))
      .map((f) => normalizarCaminhoRelativo(path.join(subpastaFull, f.name)));

    const arquivosTxt = arquivos.filter((f) => path.extname(f.name).toLowerCase() === '.txt');

    if (imagens.length === 0 && arquivosTxt.length === 0) {
      avisos.push(`Subpasta "${subpasta}" ignorada por não conter imagens nem arquivo .txt.`);
      continue;
    }

    let textoOriginal = '';
    let arquivoTxtRelativo = null;

    if (arquivosTxt.length > 0) {
      const txtFull = path.join(subpastaFull, arquivosTxt[0].name);
      arquivoTxtRelativo = normalizarCaminhoRelativo(txtFull);
      textoOriginal = lerTextoComEncodingSeguro(txtFull);
      if (!textoOriginal.trim()) {
        avisos.push(`O arquivo "${arquivoTxtRelativo}" está vazio (0 bytes). Dados ausentes tratados como "Sob consulta".`);
      }
    } else {
      avisos.push(`Subpasta "${subpasta}" não possui arquivo .txt de descrição.`);
    }

    const dadosExtraidos = extrairDadosTxt(textoOriginal, subpasta);
    const visualMeta = VISUAL_IMAGE_METADATA[subpasta] || {};
    const categorias = classificarCategorias(dadosExtraidos, visualMeta);

    const slugBase = `${dadosExtraidos.nomeExibicao}${dadosExtraidos.ano ? '-' + dadosExtraidos.ano : ''}`
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    if (visualMeta.observacaoVisual) {
      avisos.push(`Subpasta "${subpasta}": ${visualMeta.observacaoVisual}`);
    }

    veiculos.push({
      id: `veiculo-${subpasta}`,
      slug: slugBase || `veiculo-${subpasta}`,
      ordem: Number(subpasta) || veiculos.length + 1,
      pastaOrigem: normalizarCaminhoRelativo(subpastaFull),
      arquivoTexto: arquivoTxtRelativo,
      textoOriginal: textoOriginal.trim() ? textoOriginal.replace(/\r\n/g, '\n').trim() : null,
      nome: dadosExtraidos.nomeExibicao,
      nomeDocumento: dadosExtraidos.nomeDocumento,
      marca: dadosExtraidos.marca,
      modelo: dadosExtraidos.modelo,
      versao: dadosExtraidos.versao,
      ano: dadosExtraidos.ano,
      transmissao: dadosExtraidos.transmissao,
      lugares: dadosExtraidos.lugares,
      carroceria: visualMeta.carroceria || null,
      caracteristicasExtras: dadosExtraidos.caracteristicasExtras,
      precoValor: dadosExtraidos.precoValor,
      precoFormatado: dadosExtraidos.precoFormatado,
      unidadeCobranca: dadosExtraidos.unidadeCobranca,
      textoPrecoOriginal: dadosExtraidos.textoPrecoOriginal,
      dadosIncompletos: dadosExtraidos.dadosIncompletos,
      motivoIncompleto: dadosExtraidos.motivoIncompleto,
      observacaoCatalogo: visualMeta.observacaoVisual || null,
      imagemCapa: imagens[0] || null,
      imagens,
      altFoto: visualMeta.altFoto || `Foto do veículo ${dadosExtraidos.nomeExibicao}`,
      categorias
    });
  }

  return {
    geradoEm: new Date().toISOString(),
    pastaBase: dirEncontrado.nome,
    empresa: {
      nome: 'Brazil Car',
      subtitulo: 'Locadora de Veículos',
      cidade: 'Nova Serrana – MG',
      whatsappFormatado: '+55 37 9665-2007',
      whatsappNumero: '553796652007'
    },
    categoriasDisponiveis: [
      'Todos',
      'Automáticos',
      'Econômicos',
      'Trabalho',
      'Viagem',
      'Família',
      'Manuais',
      'Mais espaço'
    ],
    avisosExtracao: avisos,
    veiculos
  };
}

function main() {
  const resultado = escanearCatalogo();

  const jsonPath = path.join(ROOT_DIR, 'dados-veiculos.json');
  fs.writeFileSync(jsonPath, JSON.stringify(resultado, null, 2), 'utf8');

  const jsContent = `/**
 * Arquivo gerado automaticamente por \`scripts/gerar-catalogo.js\`
 * a partir da leitura das pastas de veículos e arquivos .txt.
 * Não edite valores manualmente sem atualizar os arquivos de origem.
 */
window.BRAZIL_CAR_DATA = ${JSON.stringify(resultado, null, 2)};
`;
  const jsPath = path.join(ROOT_DIR, 'dados-veiculos.js');
  fs.writeFileSync(jsPath, jsContent, 'utf8');

  console.log(`Catálogo gerado com sucesso: ${resultado.veiculos.length} veículos processados.`);
  resultado.avisosExtracao.forEach((aviso) => console.log(`[AVISO] ${aviso}`));
}

main();

