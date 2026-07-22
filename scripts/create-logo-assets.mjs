import * as fontkit from 'fontkit';
import { JSDOM } from 'jsdom';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..');
const resourcesLogoDir = path.join(repoRoot, 'resources', 'logo');
const publicDir = path.join(repoRoot, 'public');

const sourceSvgs = {
  light: path.join(resourcesLogoDir, 'havResonance-light.source.svg'),
  dark: path.join(resourcesLogoDir, 'havResonance-dark.source.svg'),
};

const targetSvgs = {
  light: path.join(publicDir, 'havResonance-light.svg'),
  dark: path.join(publicDir, 'havResonance-dark.svg'),
};

const args = process.argv.slice(2);

function getArgValue(...names) {
  for (let index = 0; index < args.length; ++index) {
    if (names.includes(args[index])) {
      return args[index + 1];
    }

    for (const name of names) {
      const prefix = `${name}=`;

      if (args[index].startsWith(prefix)) {
        return args[index].slice(prefix.length);
      }
    }
  }

  return undefined;
}

function findFontPath() {
  const explicitFontPath = getArgValue('--font', '-f') ?? process.env.HAVRESONANCE_LOGO_FONT;

  if (explicitFontPath) {
    return path.resolve(explicitFontPath);
  }

  const defaultFontPath = path.join(resourcesLogoDir, 'Oswald.ttf');

  if (fs.existsSync(defaultFontPath)) {
    return defaultFontPath;
  }

  throw new Error(`Oswald font not found: ${defaultFontPath}. Pass --font path/to/Oswald.ttf.`);
}

function parseNumber(value, label, filePath) {
  const parsed = Number.parseFloat(value);

  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid ${label} in ${filePath}: ${value}`);
  }

  return parsed;
}

function toPosixRelativePath(filePath) {
  return path.relative(repoRoot, filePath).split(path.sep).join('/');
}

function createPathElement(document, font, textNode, fontSize, filePath) {
  const text = textNode.textContent ?? '';
  const x = parseNumber(textNode.getAttribute('x'), 'text x', filePath);
  const y = parseNumber(textNode.getAttribute('y'), 'text y', filePath);
  const pathElement = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  const pathData = getTextPathData(font, text, x, y, fontSize);

  for (const attribute of textNode.attributes) {
    if (attribute.name !== 'x' && attribute.name !== 'y') {
      pathElement.setAttribute(attribute.name, attribute.value);
    }
  }

  pathElement.setAttribute('d', pathData);

  return pathElement;
}

function getTextPathData(font, text, x, y, fontSize) {
  const scale = fontSize / font.unitsPerEm;
  const glyphRun = font.layout(text);
  const commands = [];
  let currentX = x;

  for (const [index, glyph] of glyphRun.glyphs.entries()) {
    const position = glyphRun.positions[index];

    commands.push(
      ...getGlyphPathCommands(
        glyph,
        currentX + position.xOffset * scale,
        y - position.yOffset * scale,
        scale,
      ),
    );

    currentX += position.xAdvance * scale;
  }

  return getPathDataFitToAdvance(commands, x, currentX);
}

function getGlyphPathCommands(glyph, x, y, scale) {
  return glyph.path.commands.map((command) => {
    switch (command.command) {
      case 'moveTo':
        return { type: 'M', points: [[x + command.args[0] * scale, y - command.args[1] * scale]] };

      case 'lineTo':
        return { type: 'L', points: [[x + command.args[0] * scale, y - command.args[1] * scale]] };

      case 'quadraticCurveTo':
        return {
          type: 'Q',
          points: [
            [x + command.args[0] * scale, y - command.args[1] * scale],
            [x + command.args[2] * scale, y - command.args[3] * scale],
          ],
        };

      case 'bezierCurveTo':
        return {
          type: 'C',
          points: [
            [x + command.args[0] * scale, y - command.args[1] * scale],
            [x + command.args[2] * scale, y - command.args[3] * scale],
            [x + command.args[4] * scale, y - command.args[5] * scale],
          ],
        };

      case 'closePath':
        return { type: 'Z', points: [] };

      default:
        throw new Error(`Unsupported glyph path command: ${command.command}`);
    }
  });
}

function getPathDataFitToAdvance(commands, left, right) {
  const bounds = getCommandBounds(commands);
  const width = bounds.maxX - bounds.minX;
  const targetWidth = right - left;
  const xScale = width > 0 ? targetWidth / width : 1;

  return commands
    .map((command) => formatCommand(command, (x) => left + (x - bounds.minX) * xScale))
    .join('');
}

function getCommandBounds(commands) {
  const xValues = commands.flatMap((command) => command.points.map(([x]) => x));

  if (xValues.length === 0) {
    throw new Error('Cannot determine bounds for an empty text path.');
  }

  return {
    minX: Math.min(...xValues),
    maxX: Math.max(...xValues),
  };
}

function formatCommand(command, transformX) {
  switch (command.type) {
    case 'M':
    case 'L':
      return `${command.type}${formatPoint(command.points[0], transformX)}`;

    case 'Q':
      return `Q${formatPoint(command.points[0], transformX)} ${formatPoint(command.points[1], transformX)}`;

    case 'C':
      return `C${formatPoint(command.points[0], transformX)} ${formatPoint(command.points[1], transformX)} ${formatPoint(command.points[2], transformX)}`;

    case 'Z':
      return 'Z';

    default:
      throw new Error(`Unsupported SVG path command: ${command.type}`);
  }
}

function formatPoint([x, y], transformX) {
  return `${formatNumber(transformX(x))} ${formatNumber(y)}`;
}

function formatNumber(value) {
  if (!Number.isFinite(value)) {
    throw new Error(`Invalid generated SVG path coordinate: ${value}`);
  }

  const rounded = Math.round(value * 100) / 100;

  if (Object.is(rounded, -0)) {
    return '0';
  }

  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2);
}

function convertSvgTextToPaths(sourcePath, targetPath, font) {
  const source = fs.readFileSync(sourcePath, 'utf8');
  const dom = new JSDOM(source, { contentType: 'image/svg+xml' });
  const document = dom.window.document;
  const textGroup = document.querySelector('g text')?.parentElement;

  if (!textGroup) {
    throw new Error(`No SVG text group found in ${sourcePath}.`);
  }

  const fontSize = parseNumber(textGroup.getAttribute('font-size'), 'font-size', sourcePath);
  const textNodes = [...textGroup.querySelectorAll('text')];
  const parent = textGroup.parentElement;

  if (!parent) {
    throw new Error(`Text group has no parent in ${sourcePath}.`);
  }

  for (const textNode of textNodes) {
    parent.insertBefore(
      createPathElement(document, font, textNode, fontSize, sourcePath),
      textGroup,
    );
  }

  textGroup.remove();
  removeFontFaceStyles(document);

  const comment = document.createComment(
    ` Generated from ${toPosixRelativePath(sourcePath)} by scripts/create-logo-assets.mjs. Do not edit directly. `,
  );

  insertGeneratedComment(document, comment);

  const output =
    `<?xml version="1.0" encoding="UTF-8"?>\n${document.documentElement.outerHTML}\n`.replace(
      /[ \t]+$/gm,
      '',
    );

  fs.writeFileSync(targetPath, output, 'utf8');
}

function insertGeneratedComment(document, comment) {
  const svgElement = document.documentElement;

  while (svgElement.firstChild?.nodeType === 3 && svgElement.firstChild.textContent.trim() === '') {
    svgElement.firstChild.remove();
  }

  const firstChild = svgElement.firstChild;

  svgElement.insertBefore(document.createTextNode('\n  '), firstChild);
  svgElement.insertBefore(comment, firstChild);
  svgElement.insertBefore(document.createTextNode('\n  '), firstChild);
}

function removeFontFaceStyles(document) {
  for (const style of [...document.querySelectorAll('style')]) {
    if (style.textContent?.includes('@font-face')) {
      const parent = style.parentElement;

      style.remove();

      if (parent?.tagName.toLowerCase() === 'defs' && parent.children.length === 0) {
        parent.remove();
      }
    }
  }
}

const fontPath = findFontPath();
const font = fontkit.openSync(fontPath);

for (const [theme, sourcePath] of Object.entries(sourceSvgs)) {
  if (!fs.existsSync(sourcePath)) {
    throw new Error(`Required logo source SVG not found: ${sourcePath}`);
  }

  convertSvgTextToPaths(sourcePath, targetSvgs[theme], font);
}

console.log(`Generated outlined logo SVGs in ${publicDir}`);
