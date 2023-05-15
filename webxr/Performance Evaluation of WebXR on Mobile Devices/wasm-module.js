let wasmModule;
async function loadWasm() {
 const response = await fetch("https://cdn.glitch.global/fae4f3fc-0f15-4ca3-8e80-0e9d5a5ac871/simple.wasm?v=1681240926644");
  const buffer = await response.arrayBuffer();
  const { instance } = await WebAssembly.instantiate(buffer);
  wasmModule = instance.exports;
}

function myFunction(x, y) {
  return wasmModule.add(x, y);
}

loadWasm();
