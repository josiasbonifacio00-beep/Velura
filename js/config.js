/* VELURA - config.js
   Configuracoes do produto e da loja. E o unico arquivo que voce precisa editar para preco e checkout. */
const CONFIG = {
  brand: "VELURA",
  price: null, // numero (ex.: 29). null = mostra "[Price: to be confirmed]". Preco de trabalho PROVISORIO: US$29 (ainda nao decidido)
  currency: "USD", // moeda usada para formatar o preco
  checkoutUrl: "", // URL do checkout da loja. Vazio = avisa que o checkout nao esta conectado
  /* Shopify (opcional): com o dominio e os IDs de variante preenchidos, o botao de checkout monta
     o link do carrinho (https://loja.myshopify.com/cart/ID:QTD,...) com cor e quantidade.
     "std" e a variante usada quando COLOR_OPTIONS_CONFIRMED esta desligado. Tem prioridade sobre checkoutUrl. */
  shopify: { domain: "", variants: { pink: "", blue: "", std: "" } },
  REMOVABLE_HEADS_CONFIRMED: true, // cabecas desencaixam (animacao de troca)
  COLOR_OPTIONS_CONFIRMED: true, // mostra botoes e linha de cores Pink/Blue
  /* politicas do rodape: URL de cada pagina. Vazio = rola para a secao da pagina (envio, devolucoes, contato) ou avisa "[... nao publicada]" */
  policies: { shipping: "", returns: "", contact: "", privacy: "", terms: "" },
  CABLE_IN_BOX_CONFIRMED: false, // mostra "cabo USB incluido" (ligar so depois de confirmar com o fornecedor)
  model: "models/velura.glb", // modelo 3D do produto (GLB exportado do Blender)
  gltfLocal: "js/vendor/GLTFLoader.js",
  gltfCdn: "https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js",
  threeLocal: "js/vendor/three.min.js",
  threeCdn: "https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.min.js",
};
