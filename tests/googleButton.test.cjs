const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const babel = require('@babel/core');

// Contract tests with native primitives mocked; these do not replace a device test.
const filename = path.resolve(__dirname, '../src/components/GoogleButton.js');
const loaded = new Module(filename, module);
loaded.filename = filename;
loaded.paths = Module._nodeModulePaths(path.dirname(filename));
loaded.require = (name) => {
  if (name === 'react-native') return {
    ActivityIndicator: 'ActivityIndicator', Image: 'Image', Pressable: 'Pressable',
    Text: 'Text', View: 'View', StyleSheet: { create: (styles) => styles },
  };
  if (name === '../theme/colors') return { colors: {} };
  if (name === '../theme/tokens') return { controls: {}, radii: {}, spacing: {} };
  if (name.endsWith('.png')) return path.resolve(path.dirname(filename), name);
  return Module.prototype.require.call(loaded, name);
};
loaded._compile(babel.transformSync(fs.readFileSync(filename, 'utf8'), {
  babelrc: false,
  configFile: false,
  plugins: [
    ['@babel/plugin-transform-react-jsx', { runtime: 'automatic' }],
    '@babel/plugin-transform-modules-commonjs',
  ],
}).code, filename);
const { GoogleButton } = loaded.exports;

function find(element, type) {
  if (!element || typeof element !== 'object') return null;
  if (element.type === type) return element;
  for (const child of [element.props?.children].flat()) {
    const found = find(child, type);
    if (found) return found;
  }
  return null;
}

const onPress = () => {};
const button = GoogleButton({ onPress });
assert.equal(button.type, 'Pressable');
assert.equal(button.props.onPress, onPress);
assert.equal(button.props.disabled, false);
assert.equal(button.props.accessibilityLabel, 'Continuar com Google');
assert.equal(button.props.accessibilityRole, 'button');

const icon = find(button, 'Image');
assert.ok(icon, 'Use the actual Google image, not a text G');
assert.equal(icon.props.source, path.resolve(__dirname, '../assets/google-g.png'));
assert.equal(icon.props.resizeMode, 'contain');
assert.equal(icon.props.style.tintColor, undefined, 'Do not recolor the multicolor symbol');
assert.equal(icon.props.accessible, false);
assert.equal(icon.props.importantForAccessibility, 'no');
assert.equal(icon.props.fadeDuration, 0);
assert.equal(find(button, 'Text').props.children, 'Continuar com Google');

const png = fs.readFileSync(icon.props.source);
assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
assert.equal(png.readUInt32BE(16), 200);
assert.equal(png.readUInt32BE(20), 204);

const busy = GoogleButton({ onPress, loading: true });
assert.equal(busy.props.disabled, true);
assert.deepEqual(busy.props.accessibilityState, { busy: true, disabled: true });
assert.ok(find(busy, 'ActivityIndicator'));
assert.equal(find(busy, 'Image'), null);
assert.equal(busy.props.accessibilityLabel, 'Continuar com Google');

const disabled = GoogleButton({ onPress, disabled: true });
assert.equal(disabled.props.disabled, true);
assert.deepEqual(disabled.props.accessibilityState, { busy: false, disabled: true });
assert.ok(find(disabled, 'Image'));
assert.equal(find(disabled, 'ActivityIndicator'), null);

console.log('GoogleButton: asset local, proporção, acessibilidade, callback, loading e disabled OK.');
