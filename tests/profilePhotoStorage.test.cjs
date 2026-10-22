const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const babel = require('@babel/core');

const values = new Map();
const files = new Set();
const filename = path.resolve(__dirname, '../src/services/profilePhotoStorage.js');
let failNextSet = false;

class Directory {
  constructor(...parts) {
    this.uri = parts.map((part) => typeof part === 'string' ? part : part.uri).join('/');
  }
  create() {}
}

class File {
  constructor(...parts) {
    this.uri = parts.map((part) => typeof part === 'string' ? part : part.uri).join('/');
  }
  get exists() { return files.has(this.uri); }
  async copy(destination) {
    if (!this.exists) throw new Error('source file missing');
    files.add(destination.uri);
  }
  delete() { files.delete(this.uri); }
}

const loaded = new Module(filename, module);
loaded.filename = filename;
loaded.paths = Module._nodeModulePaths(path.dirname(filename));
loaded.require = (name) => {
  if (name === '@react-native-async-storage/async-storage') {
    return {
      getItem: async (key) => values.get(key) || null,
      setItem: async (key, value) => {
        if (failNextSet) {
          failNextSet = false;
          throw new Error('storage write failed');
        }
        values.set(key, value);
      },
      removeItem: async (key) => { values.delete(key); },
    };
  }
  if (name === 'expo-file-system') {
    return { Directory, File, Paths: { document: { uri: 'file:///documents' } } };
  }
  return Module.prototype.require.call(loaded, name);
};
loaded._compile(babel.transformSync(fs.readFileSync(filename, 'utf8'), {
  babelrc: false,
  configFile: false,
  plugins: ['@babel/plugin-transform-modules-commonjs'],
}).code, filename);

const { clearProfilePhoto, getProfilePhoto, saveProfilePhoto } = loaded.exports;

(async () => {
  files.add('file:///cache/alice.jpg');
  files.add('file:///cache/bob.jpg');

  const alicePhoto = await saveProfilePhoto(101, 'file:///cache/alice.jpg');
  const bobPhoto = await saveProfilePhoto(102, 'file:///cache/bob.jpg');
  assert.equal(await getProfilePhoto(101), alicePhoto);
  assert.equal(await getProfilePhoto(102), bobPhoto);
  assert.notEqual(alicePhoto, bobPhoto);

  files.add('file:///cache/alice-next.jpg');
  const nextAlicePhoto = await saveProfilePhoto(101, 'file:///cache/alice-next.jpg');
  assert.equal(await getProfilePhoto(101), nextAlicePhoto);
  assert.equal(files.has(alicePhoto), false, 'previous photo file is cleaned up after replacement');
  assert.equal(files.has(bobPhoto), true, 'other account photo remains untouched');

  await clearProfilePhoto(101);
  assert.equal(await getProfilePhoto(101), null);
  assert.equal(files.has(nextAlicePhoto), false);
  assert.equal(await getProfilePhoto(102), bobPhoto);
  files.add('file:///cache/alice-late.jpg');
  await assert.rejects(saveProfilePhoto(101, 'file:///cache/alice-late.jpg'), /conta foi excluída/);
  assert.equal([...files].some((uri) => uri.includes('profile-101-')), false);

  files.add('file:///cache/unsaved.jpg');
  failNextSet = true;
  await assert.rejects(saveProfilePhoto(103, 'file:///cache/unsaved.jpg'), /storage write failed/);
  assert.equal([...files].some((uri) => uri.includes('profile-103-')), false, 'copied file is removed when metadata save fails');

  await assert.rejects(saveProfilePhoto(null, 'file:///cache/alice.jpg'), /Identificador de usuário inválido/);
  await assert.rejects(saveProfilePhoto(104, ''), /não possui um arquivo válido/);

  console.log('Profile photo storage: persistent files are isolated and cleaned up per account.');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
