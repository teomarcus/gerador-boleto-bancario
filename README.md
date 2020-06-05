# gerar-boletos
<!-- [START badges] -->
[![NPM gerar-boletos package](https://img.shields.io/npm/v/gerar-boletos.svg)](https://npmjs.org/package/gerar-boletos)
<!-- [END badges] -->

Biblioteca em Node.js para geração de boletos utilizando PDFKit baseada e modificada a partir do [gerador-boletos](https://npmjs.org/package/gerador-boletos).

Principais mudanças contempladas: (tarefas ainda em andamento)
- Novo modelo de boleto com correções de quebra de página
- Novo modelo de recibo do pagador com campo de descrições
- Adaptações de exemplo para Caixa Econômica Federal
- Opção para saída do PDF em blob para download ou visualização direta no browser.

Geração de boletos para bancos:
- Bradesco
- Caixa
- Ailos (Cecred)
- Itaú
- Sicoob
- Sicredi
- Santander
- Banco do Brasil

### Install

```javascript
npm i gerar-boletos
```
### Exemplos de uso

* [aqui](/examples)

### Run tests

```javascript
npm run test
```


