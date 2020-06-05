'use strict';

const path = require('path');
const StringUtils = require('../utils/string-utils');
const ObjectUtils = require('../utils/object-utils');
const Pdf = require('pdfkit');
const { Base64Encode } = require('base64-stream');

const GeradorDeLinhaDigitavel = require('./gerador-de-linha-digitavel');
const diretorioDeFontes = path.join(__dirname, '/fontes');
const code25I = path.join(diretorioDeFontes, 'Code25I.ttf');

const GeradorDeBoleto = (function() {
	function GeradorDeBoleto(boletos) {
		if (!Array.isArray(boletos)) {
			boletos = [boletos];
		}

		this._boletos = boletos;
	}

	const pdfDefaults = {
		autor: '',
		titulo: '',
		criador: '',
		larguraPagina: 595.44,
		alturaPagina: 841.68,
		ajusteY: -80,
		ajusteX: 0,
		marginLeft:25,
		marginTop: 25,
		fontSizeTitulos: 7.222,
		fontSizeTextos: 9.666, //10
		fontSizeLinhaDigitavel: 12.6,
		alturaCodBarras: 32,
		larguraBoleto:544,
		larguraCamposDireita:136,
		larguraCodigoBarras: 324,
		alturaCampos: 24,
		alturaCamposExtra: 32, // +25% campo normal
		paddingCampos: 2.666,
		larguraLogoBanco: 126,
		imprimirSequenciaDoBoleto: true,
		corLinhas: 'black',
		opacityCamposDestac: .175,
		exibirCampoUnidadeBeneficiaria: false,
		arquivoTesoura: path.join(__dirname, 'imagens/tesoura128.png'),
		//template: path.join(__dirname, '/templates/template.pdf'), // That is not possible with PDFKit
		informacoesPersonalizadas: function(pdf, x, y) {}
	};

	GeradorDeBoleto.prototype.gerarPDF = function(args) {
		return new Promise((resolve)=> {
			if (typeof args === 'function') {
				args = pdfDefaults;
			}

			args = ObjectUtils.merge(pdfDefaults, args);

			const boletos = this._boletos;
			const informacoesPersonalizadas = args.informacoesPersonalizadas;
			const pdf = new Pdf({
				size: [
					args.larguraPagina,
					args.alturaPagina
				],
				info: {
					Author: args.autor,
					Title: args.titulo,
					Creator: args.criador,
				}
			});

			if (args.stream) {
				pdf.pipe(args.stream);
			}

			pdf.registerFont('normal', 'Helvetica');
			pdf.registerFont('negrito', 'Helvetica-Bold');
			pdf.registerFont('italico', 'Helvetica-Oblique');
			pdf.registerFont('negrito-italico', 'Helvetica-BoldOblique');
			pdf.registerFont('codigoDeBarras', code25I);

			
			boletos.forEach(function escreveOsDadosDoBoleto(boleto, indice) {
				
				// COLETANDO DADOS

				const banco = boleto.getBanco();
				const logoBanco = banco.getImagem();
				const nomeBanco = banco.getNome();
				const numBancoDigito = banco.getNumeroFormatadoComDigito();
				const codigoDeBarras = banco.geraCodigoDeBarrasPara(boleto);
				const especieDoc = boleto.getEspecieDocumento();
				const linhaDigitavel = GeradorDeLinhaDigitavel(codigoDeBarras, banco);
				const pagador = boleto.getPagador();
				const identificacaoPagador = pagador.getIdentificacao();
				const nomePagador = pagador.getNome();
				const regNacPagadorFormatado = pagador.getRegistroNacionalFormatado();
				const enderecoPagador = pagador.getEndereco();
				const cidadePagador = enderecoPagador.getCidade();
				const enderecoCurtoPagador = enderecoPagador.getPrimeiraLinha() + (cidadePagador ? ', '+cidadePagador : '');
				const ufPagador = enderecoPagador.getUf();
				const cepPagador = enderecoPagador.getCepFormatado();
				const beneficiario = boleto.getBeneficiario();
				const aceiteFormatado = boleto.getAceiteFormatado();
				const carteiraTexto = banco.getCarteiraTexto(beneficiario);
				const identificacaoBeneficiario = beneficiario.getIdentificacao();
				const nomeBeneficiario = beneficiario.getNome();
				const regNacBenefFormatado = beneficiario.getRegistroNacionalFormatado();
				const enderecoBeneficiario = beneficiario.getEndereco();
				const cidadeBeneficiario = enderecoBeneficiario.getCidade();
				const enderecoCurtoBeneficiario = enderecoBeneficiario.getPrimeiraLinha() + (cidadeBeneficiario ? ', '+cidadeBeneficiario : '');
				const ufBeneficiario = enderecoBeneficiario.getUf();
				const cepBeneficiario = enderecoBeneficiario.getCepFormatado();
				const agenciaCodBeneficiario = banco.getAgenciaECodigoBeneficiario(boleto);
				const datas = boleto.getDatas();
				const dataDocFormatado = datas.getDocumentoFormatado();
				const dataVencFormatado = datas.getVencimentoFormatado();
				const dataProcFormatado = datas.getProcessamentoFormatado();
				const numDocFormatado = StringUtils.pad(boleto.getNumeroDoDocumentoFormatado(boleto), 8, '0');
				const nossoNumFormatado = StringUtils.pad(banco.getNossoNumeroECodigoDocumento(boleto), 8, '0');
				const valorDocFormatado = boleto.getValorFormatadoBRL();
				const instrucoes = boleto.getInstrucoes();
				const descricoes = boleto.getDescricoes();
				const modeloReciboPagador = banco.modeloReciboDoPagador();

				const titulos = ObjectUtils.merge({
					beneficiario: 'Beneficiário',
					cpfCnpj: 'CPF/CNPJ',
					enderecoBeneficiario: 'Endereço do Beneficiário',
					uf: 'UF',
					cep: 'CEP',
					instrucoes: 'Instruções (Texto de Responsabilidade do Beneficiário)',
					informacoes: 'Informações (Texto de Responsabilidade do Beneficiário)',
					dataDocumento: 'Data Documento',
					pagador: 'Pagador:',
					nomeDoPagador: 'Nome do Cliente',
					agCodBeneficiario: 'Agência / Código do Beneficiário',
					nossoNumero: 'Nosso Número',
					especie: 'Espécie',
					aceite: 'Aceite',
					especieDoc: 'Espécie Doc.',
					quantidade: 'Quantidade',
					numDocumento: 'Nº do Documento',
					vencimento: 'Vencimento',
					dataVencimento: 'Data de Vencimento',
					dataProcessamento: 'Data Processamento',
					valorDocumento: 'Valor do Documento',
					valorCobrado: 'Valor Cobrado',
					valor: 'Valor',
					carteira: 'Carteira',
					moraMulta: '(+) Mora / Multa',
					localDoPagamento: 'Local do Pagamento',
					igualDoValorDoDocumento: '(=) ',
					autentMecanica: 'Autenticação Mecânica'
				}, banco.getTitulos ? banco.getTitulos() : {});

				const ESPACO_ENTRE_LINHAS = 23;

				const textosCampoBasico = (tit, txt, x, y, width, align = 'left', padding = args.paddingCampos, destacado = false) =>{
					return(
						pdf.font('negrito')
							.fontSize(args.fontSizeTitulos)
							.text(tit, x + args.paddingCampos, y + args.paddingCampos, {
								lineBreak: false,
								width: width - args.paddingCampos*2,
								align: 'left'
							})
							.font(!destacado ? 'normal' : 'negrito')
							.fontSize(!destacado ? args.fontSizeTextos : args.fontSizeTextos*1.125)
							.text(txt, x + padding, y + args.fontSizeTitulos + args.paddingCampos*2, {
								lineBreak: false,
								width: width - padding*2,
								align: align
							})
					);
				}
				
				pdf.save();

				//////////////////////////////////////////////////////////////////////////
				//////////////////////////	RECIBO DO PAGADOR	//////////////////////////

				let posX = args.marginLeft,
					posY = args.marginTop,
					widthCampo = args.larguraLogoBanco;

				if(modeloReciboPagador===3){ 
					
					// MODELO COMPLETO

					// LINHA 1

					pdf.image(logoBanco, posX, posY, {
						height: args.alturaCampos-args.paddingCampos
					});

					banco.getImprimirNome() && pdf.font('negrito')
						.fontSize(args.fontSizeLinhaDigitavel)
						.text(nomeBanco, posX, posY, {
							lineBreak: false,
							width: widthCampo,
							align: 'left'
						});
					
					posX += widthCampo;
					widthCampo = 46;

					pdf.moveTo(posX, posY).lineTo(posX, posY+args.alturaCampos).stroke(args.corLinhas);

					pdf.font('negrito')
						.fontSize(args.fontSizeLinhaDigitavel)
						.text(numBancoDigito, posX, posY+args.paddingCampos+((args.alturaCampos-args.fontSizeLinhaDigitavel)/2.666), {
							lineBreak: false,
							width: widthCampo,
							align: 'center'
						});

					posX += widthCampo;
					widthCampo = args.marginLeft+args.larguraBoleto-posX;

					pdf.moveTo(posX, posY).lineTo(posX, posY+args.alturaCampos).stroke(args.corLinhas);

					pdf.font('negrito')
						.fontSize(args.fontSizeLinhaDigitavel)
						.text(linhaDigitavel, posX, posY+args.paddingCampos+((args.alturaCampos-args.fontSizeLinhaDigitavel)/2.666), {
							lineBreak: false,
							width: widthCampo,
							align: 'right'
						});
					
					// LINHA 2

					posX = args.marginLeft;
					posY += args.alturaCampos;
					widthCampo = 280;

					pdf.moveTo(posX, posY).lineTo(posX+args.larguraBoleto, posY).stroke(args.corLinhas);
					pdf.moveTo(posX, posY).lineTo(posX, posY+args.alturaCampos).stroke(args.corLinhas);

					textosCampoBasico(
						titulos.beneficiario, 
						nomeBeneficiario.toUpperCase(), 
						posX, posY, widthCampo, 'left'
					);
					
					posX += widthCampo;
					pdf.moveTo(posX, posY).lineTo(posX, posY+args.alturaCampos).stroke(args.corLinhas);
					
					widthCampo = args.marginLeft+args.larguraBoleto-posX-args.larguraCamposDireita;
					textosCampoBasico(
						titulos.cpfCnpj, 
						regNacBenefFormatado, 
						posX, posY, widthCampo, 'left'
					);

					posX += widthCampo;
					pdf.moveTo(posX, posY).lineTo(posX, posY+args.alturaCampos).stroke(args.corLinhas);

					widthCampo = args.larguraCamposDireita;

					textosCampoBasico(
						titulos.agCodBeneficiario, 
						agenciaCodBeneficiario, 
						posX, posY, widthCampo, 'left'
					);

					posX = args.marginLeft+args.larguraBoleto;
					pdf.moveTo(posX, posY).lineTo(posX, posY+args.alturaCampos).stroke(args.corLinhas);
					

					// LINHA 3

					posX = args.marginLeft;
					posY += args.alturaCampos;
					widthCampo = 358;

					pdf.moveTo(posX, posY).lineTo(posX+args.larguraBoleto, posY).stroke(args.corLinhas);
					pdf.moveTo(posX, posY).lineTo(posX, posY+args.alturaCampos).stroke(args.corLinhas);

					textosCampoBasico(
						titulos.enderecoBeneficiario, 
						enderecoCurtoBeneficiario, 
						posX, posY, widthCampo, 'left'
					);
					
					posX += widthCampo;
					pdf.moveTo(posX, posY).lineTo(posX, posY+args.alturaCampos).stroke(args.corLinhas);
					
					widthCampo = args.marginLeft+args.larguraBoleto-posX-args.larguraCamposDireita;
					textosCampoBasico(
						titulos.uf, 
						ufBeneficiario, 
						posX, posY, widthCampo, 'center'
					);

					posX += widthCampo;
					pdf.moveTo(posX, posY).lineTo(posX, posY+args.alturaCampos).stroke(args.corLinhas);

					widthCampo = args.larguraCamposDireita;

					textosCampoBasico(
						titulos.cep, 
						cepBeneficiario, 
						posX, posY, widthCampo, 'left'
					);

					posX = args.marginLeft+args.larguraBoleto;
					pdf.moveTo(posX, posY).lineTo(posX, posY+args.alturaCampos).stroke(args.corLinhas);
					
					// LINHA 4

					posX = args.marginLeft;
					posY += args.alturaCampos;
					widthCampo = 100;
					pdf.moveTo(posX, posY).lineTo(posX+args.larguraBoleto, posY).stroke(args.corLinhas);
					pdf.moveTo(posX, posY).lineTo(posX, posY+args.alturaCampos).stroke(args.corLinhas);

					textosCampoBasico(
						titulos.dataDocumento, 
						dataDocFormatado, 
						posX, posY, widthCampo, 'left'
					);

					posX += widthCampo;
					pdf.moveTo(posX, posY).lineTo(posX, posY+args.alturaCampos).stroke(args.corLinhas);

					widthCampo = 60;
					textosCampoBasico(
						titulos.aceite, 
						aceiteFormatado, 
						posX, posY, widthCampo, 'center'
					);
					
					posX += widthCampo;
					pdf.moveTo(posX, posY).lineTo(posX, posY+args.alturaCampos).stroke(args.corLinhas);
					
					widthCampo = 120;
					textosCampoBasico(
						titulos.numDocumento, 
						numDocFormatado, 
						posX, posY, widthCampo, 'left'
					);

					posX += widthCampo;
					pdf.moveTo(posX, posY).lineTo(posX, posY+args.alturaCampos).stroke(args.corLinhas);
					
					widthCampo = args.marginLeft+args.larguraBoleto-posX-args.larguraCamposDireita;
					textosCampoBasico(
						titulos.dataProcessamento, 
						dataProcFormatado,
						posX, posY, widthCampo, 'left'
					);

					posX += widthCampo;
					pdf.moveTo(posX, posY).lineTo(posX, posY+args.alturaCampos).stroke(args.corLinhas);

					widthCampo = args.larguraCamposDireita;

					textosCampoBasico(
						titulos.nossoNumero, 
						nossoNumFormatado, 
						posX, posY, widthCampo, 'left'
					);

					posX = args.marginLeft+args.larguraBoleto;
					pdf.moveTo(posX, posY).lineTo(posX, posY+args.alturaCampos).stroke(args.corLinhas);
					

					// LINHA 5

					posX = args.marginLeft;
					posY += args.alturaCampos;
					widthCampo = args.larguraBoleto;
					pdf.moveTo(posX, posY).lineTo(posX+args.larguraBoleto, posY).stroke(args.corLinhas);
					
					pdf.moveTo(posX, posY).lineTo(posX, posY+args.fontSizeTitulos+args.paddingCampos*2).stroke(args.corLinhas);

					pdf.font('negrito')
						.fontSize(args.fontSizeTitulos)
						.text(titulos.informacoes, posX + args.paddingCampos, posY + args.paddingCampos, {
							lineBreak: false,
							width: widthCampo - args.paddingCampos*2,
							align: 'left'
						});
						
					posX = args.marginLeft + args.larguraBoleto;
					pdf.moveTo(posX, posY).lineTo(posX, posY+args.fontSizeTitulos+args.paddingCampos*2).stroke(args.corLinhas);

					posY += (args.fontSizeTitulos+args.paddingCampos*2);

					// DESCRICOES EM 2 COLUNAS

					let descrCol1 = descricoes.slice(0, Math.ceil(descricoes.length/2));
					let descrCol2 = descricoes.slice(Math.ceil(descricoes.length/2));

					for(let i=0; i<descrCol1.length || i<descrCol2.length ; i++){
						posX = args.marginLeft;
						pdf.moveTo(posX, posY).lineTo(posX, posY+args.fontSizeTextos + args.paddingCampos).stroke(args.corLinhas);

						pdf.font('normal')
							.fontSize(args.fontSizeTextos*.933)
							.text(descrCol1[i], posX + args.paddingCampos, posY, {
								lineBreak: false,
								width: widthCampo/2 - args.paddingCampos*2,
								align: 'left'
							});

						pdf.font('normal')
							.fontSize(args.fontSizeTextos*.933)
							.text(descrCol2[i], posX + widthCampo/2 + args.paddingCampos, posY, {
								lineBreak: false,
								width: widthCampo/2 - args.paddingCampos*2,
								align: 'left'
							});

						posX = args.marginLeft + args.larguraBoleto;
						pdf.moveTo(posX, posY).lineTo(posX, posY+args.fontSizeTextos + args.paddingCampos).stroke(args.corLinhas);

						posY += (args.fontSizeTextos+args.paddingCampos/2);

						// TODO: QUEBRA DE LINHA
					}

					posX = args.marginLeft;
					pdf.moveTo(posX, posY).lineTo(posX, posY+args.paddingCampos).stroke(args.corLinhas);
					posX = args.marginLeft + args.larguraBoleto;
					pdf.moveTo(posX, posY).lineTo(posX, posY+args.paddingCampos).stroke(args.corLinhas);

					// TODO: QUEBRA DE LINHA

					// LINHA 6
					
					posX = args.marginLeft;
					posY += args.paddingCampos;
					widthCampo = args.larguraBoleto-args.larguraCamposDireita;
					pdf.moveTo(posX, posY).lineTo(posX+args.larguraBoleto, posY).stroke(args.corLinhas);
					pdf.moveTo(posX, posY).lineTo(posX, posY+args.alturaCampos).stroke(args.corLinhas);

					textosCampoBasico(
						titulos.pagador, 
						nomePagador, 
						posX, posY, widthCampo, 'left'
					);

					posX = args.marginLeft+args.larguraBoleto-args.larguraCamposDireita;
					widthCampo = args.larguraCamposDireita;

					textosCampoBasico(
						titulos.cpfCnpj, 
						regNacPagadorFormatado, 
						posX, posY, widthCampo, 'left'
					);

					posX = args.marginLeft + args.larguraBoleto;
					pdf.moveTo(posX, posY).lineTo(posX, posY+args.alturaCampos).stroke(args.corLinhas);
					
					posY += args.alturaCampos;
					posX = args.marginLeft;
					widthCampo = args.larguraBoleto-args.larguraCamposDireita;

					// LINHA 6-B

					pdf.moveTo(posX, posY).lineTo(posX, posY+args.fontSizeTextos+args.paddingCampos).stroke(args.corLinhas);

					pdf.font('normal')
						.fontSize(args.fontSizeTextos*.966)
						.text(enderecoCurtoPagador, posX + args.paddingCampos, posY + args.paddingCampos, {
							lineBreak: false,
							width: widthCampo - args.paddingCampos*2,
							align: 'left'
						});

					posX = args.marginLeft + args.larguraBoleto-args.larguraCamposDireita;
					widthCampo = args.larguraCamposDireita/2.666;

					pdf.font('negrito')
						.fontSize(args.fontSizeTitulos*1.1)
						.text(titulos.uf+': ', posX + args.paddingCampos, posY + args.paddingCampos, {
							lineBreak: false,
							width: widthCampo - args.paddingCampos*2,
							align: 'left',
							continued: true
						})
						.font('normal')
						.fontSize(args.fontSizeTextos*.966)
						.text(ufPagador);

					posX += widthCampo;
					widthCampo = args.marginLeft+args.larguraBoleto-posX;

					pdf.font('negrito')
						.fontSize(args.fontSizeTitulos*1.1)
						.text(titulos.cep+': ', posX + args.paddingCampos, posY + args.paddingCampos, {
							lineBreak: false,
							width: widthCampo - args.paddingCampos*2,
							align: 'left',
							continued: true
						})
						.font('normal')
						.fontSize(args.fontSizeTextos*.966)
						.text(cepPagador);

					posX = args.marginLeft+args.larguraBoleto;
					pdf.moveTo(posX, posY).lineTo(posX, posY+args.fontSizeTextos+args.paddingCampos).stroke(args.corLinhas);
					
					// LINHA 7
					
					posX = args.marginLeft;
					posY += (args.fontSizeTextos+args.paddingCampos);
					
					pdf.moveTo(posX, posY).lineTo(posX+args.larguraBoleto, posY).stroke(args.corLinhas);
					pdf.moveTo(posX, posY).lineTo(posX, posY+args.alturaCampos).stroke(args.corLinhas);

					widthCampo = 76;
					textosCampoBasico(
						titulos.carteira, 
						carteiraTexto, 
						posX, posY, widthCampo, 'center'
					);

					posX += widthCampo;
					pdf.moveTo(posX, posY).lineTo(posX, posY+args.alturaCampos).stroke(args.corLinhas);

					widthCampo = 76;
					textosCampoBasico(
						titulos.especieDoc, 
						especieDoc, 
						posX, posY, widthCampo, 'center'
					);

					posX += widthCampo;
					pdf.moveTo(posX, posY).lineTo(posX, posY+args.alturaCampos).stroke(args.corLinhas);

					widthCampo = 120;
					pdf.rect(posX,posY,widthCampo,args.alturaCampos)
						.lineWidth(0)
						.opacity(args.opacityCamposDestac)
						.fill(args.corLinhas)
						.restore();

					textosCampoBasico(
						titulos.vencimento, 
						dataVencFormatado, 
						posX, posY, widthCampo, 'center', args.paddingCampos, true
					);

					posX += widthCampo;
					pdf.moveTo(posX, posY).lineTo(posX, posY+args.alturaCampos).stroke(args.corLinhas);

					widthCampo = args.marginLeft+args.larguraBoleto-args.larguraCamposDireita-posX;
					pdf.rect(posX,posY,widthCampo,args.alturaCampos)
						.opacity(args.opacityCamposDestac)
						.fill(args.corLinhas)
						.opacity(1)
						.restore();

					textosCampoBasico(
						titulos.valorDocumento, 
						valorDocFormatado, 
						posX, posY, widthCampo, 'center', args.paddingCampos, true
					);

					posX = args.marginLeft+args.larguraBoleto-args.larguraCamposDireita;
					pdf.moveTo(posX, posY).lineTo(posX, posY+args.alturaCampos).stroke(args.corLinhas);

					widthCampo = args.larguraCamposDireita;
					
					textosCampoBasico(
						titulos.valorCobrado, 
						'', 
						posX, posY, widthCampo, 'center'
					);

					posX = args.marginLeft+args.larguraBoleto;
					pdf.moveTo(posX, posY).lineTo(posX, posY+args.alturaCampos).stroke(args.corLinhas);


					// LINHA 8
						
					posX = args.marginLeft;
					posY += args.alturaCampos;
					
					pdf.moveTo(posX, posY).lineTo(posX+args.larguraBoleto, posY).stroke(args.corLinhas);

					widthCampo = args.larguraCodigoBarras;

					pdf.font('normal')
						.fontSize(args.fontSizeTitulos)
						.text('TEXTO DO BANCO', posX + args.paddingCampos, posY + args.paddingCampos, {
							lineBreak: false,
							width: widthCampo - args.paddingCampos*2,
							align: 'center'
						});

					posX += widthCampo;
					widthCampo = args.marginLeft+args.larguraBoleto-posX;

					pdf.moveTo(posX, posY).lineTo(posX, posY+args.alturaCampos).stroke(args.corLinhas);
					
					pdf.font('normal')
						.fontSize(args.fontSizeTitulos)
						.text(titulos.autentMecanica+' - ', posX+widthCampo*.125, posY + args.paddingCampos*1.125, {
							lineBreak: false,
							width: widthCampo*.777,
							continued: true,
							align: 'left'
						})
						.font('negrito')
						.text('RECIBO DO PAGADOR');

					
					posY += args.alturaCampos;





				}else{

					// MODELOS SIMPLES E REDUZIDO

					let linha1 = 151;
					pdf.moveTo(args.ajusteX + 27, args.ajusteY + linha1)
						.lineTo(args.ajusteX + 572, args.ajusteY + linha1)
						.stroke(args.corLinhas);

					let linha2 = linha1 + ESPACO_ENTRE_LINHAS;
					pdf.moveTo(args.ajusteX + 27, args.ajusteY + linha2)
						.lineTo(args.ajusteX + 572, args.ajusteY + linha2)
						.stroke(args.corLinhas);

					let linha3 = linha2 + ESPACO_ENTRE_LINHAS;
					pdf.moveTo(args.ajusteX + 27, args.ajusteY + linha3)
						.lineTo(args.ajusteX + (modeloReciboPagador===2 ? 572 : 329), args.ajusteY + linha3)
						.stroke(args.corLinhas);

					if (modeloReciboPagador===2) {
						let linha4Opcional = linha3 + ESPACO_ENTRE_LINHAS;
						pdf.moveTo(args.ajusteX + 27, args.ajusteY + linha4Opcional)
							.lineTo(args.ajusteX + 329, args.ajusteY + linha4Opcional)
							.stroke(args.corLinhas);
					}

					let coluna1 = 27;
					pdf.moveTo(args.ajusteX + coluna1, args.ajusteY + linha1 - 0.5)
						.lineTo(args.ajusteX + coluna1, args.ajusteY + (modeloReciboPagador===2 ? linha4Opcional : linha3) + 0.5)
						.stroke(args.corLinhas);

					let coluna2 = 329;
					pdf.moveTo(args.ajusteX + coluna2, args.ajusteY + linha1)
						.lineTo(args.ajusteX + coluna2, args.ajusteY + (modeloReciboPagador===2 ? linha4Opcional : linha3) + 0.5)
						.stroke(args.corLinhas);

					let coluna3 = 178;
					pdf.moveTo(args.ajusteX + coluna3, args.ajusteY + linha2)
						.lineTo(args.ajusteX + coluna3, args.ajusteY + (modeloReciboPagador===2 ? linha4Opcional : linha3))
						.stroke(args.corLinhas);

					let coluna4 = 420;
					pdf.moveTo(args.ajusteX + coluna4, args.ajusteY + linha1)
						.lineTo(args.ajusteX + coluna4, args.ajusteY + (modeloReciboPagador===2 ? linha3 : linha2))
						.stroke(args.corLinhas);

					let coluna5 = 572;
					pdf.moveTo(args.ajusteX + coluna5, args.ajusteY + linha1 - 0.5)
						.lineTo(args.ajusteX + coluna5, args.ajusteY + (modeloReciboPagador===2 ? linha3 : linha2) + 0.5)
						.stroke(args.corLinhas);

					let coluna6 = coluna2 + 4;
					pdf.moveTo(args.ajusteX + coluna6, args.ajusteY + (modeloReciboPagador===2 ? linha3 : linha2) + 3.5)
						.lineTo(args.ajusteX + coluna6, args.ajusteY + (modeloReciboPagador===2 ? linha4Opcional : linha3) + 0.5)
						.stroke(args.corLinhas);

					if (modeloReciboPagador===2) {
						let coluna6Opcional = coluna3;
						pdf.moveTo(args.ajusteX + coluna6Opcional, args.ajusteY + linha3 - 0.5)
							.lineTo(args.ajusteX + coluna6Opcional, args.ajusteY + linha4Opcional + 0.5)
							.stroke(args.corLinhas);

						let coluna8Opcional = coluna1 + 75.5;
						pdf.moveTo(args.ajusteX + coluna8Opcional, args.ajusteY + linha2 - 0.5)
							.lineTo(args.ajusteX + coluna8Opcional, args.ajusteY + linha3 + 0.5)
							.stroke(args.corLinhas);
					}

					let coluna7 = coluna5;
					pdf.moveTo(args.ajusteX + coluna7, args.ajusteY + (modeloReciboPagador===2 ? linha3 : linha2) + 3.5)
						.lineTo(args.ajusteX + coluna7, args.ajusteY + (modeloReciboPagador===2 ? linha4Opcional : linha3) + 0.5)
						.stroke(args.corLinhas);

					let linha4 = (modeloReciboPagador===2 ? linha3 : linha2) + 4;
					pdf.moveTo(args.ajusteX + coluna6, args.ajusteY + linha4)
						.lineTo(args.ajusteX + coluna7, args.ajusteY + linha4)
						.stroke(args.corLinhas);


					let zeroLinha = 105+posY;
					pdf.font('negrito')
						.fontSize(args.fontSizeTitulos)
						.text('BENEFICIÁRIO:', args.ajusteX + 27, args.ajusteY + zeroLinha, {
							lineBreak: false,
							width: 294,
							align: 'left'
						});
	
					pdf.font('normal')
						.fontSize(args.fontSizeTextos)
						.text(identificacaoBeneficiario.toUpperCase(), args.ajusteX + 27, args.ajusteY + zeroLinha + args.fontSizeTextos + 1.5, {
							lineBreak: false,
							width: 545,
							align: 'left'
						});
	
	
					if (enderecoBeneficiario) {
						let zeroUmLinha = zeroLinha + 2 + args.fontSizeTextos + args.fontSizeTextos,
							zeroDoisLinha = zeroUmLinha + 1 + args.fontSizeTextos;
	
						if (enderecoBeneficiario.getPrimeiraLinha()) {
							pdf.font('normal')
								.fontSize(args.fontSizeTextos)
								.text(enderecoBeneficiario.getPrimeiraLinha(), args.ajusteX + 27, args.ajusteY + zeroUmLinha, {
									lineBreak: false,
									width: 545,
									align: 'left'
								});
	
							espacamento += espacamento;
						}
	
						if (enderecoBeneficiario.getSegundaLinha()) {
							pdf.font('normal')
								.fontSize(args.fontSizeTextos)
								.text(enderecoBeneficiario.getSegundaLinha(), args.ajusteX + 27, args.ajusteY + zeroDoisLinha, {
									lineBreak: false,
									width: 545,
									align: 'left'
								});
						}
					}
	
					pdf.font('negrito')
						.fontSize(args.fontSizeTitulos)
						.text('RECIBO DO PAGADOR', args.ajusteX + 278, args.ajusteY + zeroLinha, {
							lineBreak: false,
							width: 294,
							align: 'right'
						});
	
					let primeiraLinha = linha1 + 11,
						diferencaEntreTituloEValor = 10,
						tituloDaPrimeiraLinha = primeiraLinha - diferencaEntreTituloEValor;
	
					pdf.font('negrito')
						.fontSize(args.fontSizeTitulos)
						.text(titulos.nomeDoPagador, args.ajusteX + 32, args.ajusteY + tituloDaPrimeiraLinha, {
							lineBreak: false,
							width: 294,
							align: 'left'
						});
	
					pdf.font('normal')
						.fontSize(args.fontSizeTextos) // TODO: Diminuir tamanho da fonte caso seja maior que X caracteres
						.text(pagador.getIdentificacao(), args.ajusteX + 32, args.ajusteY + primeiraLinha, {
							lineBreak: false,
							width: 294,
							align: 'left'
						});
	
					pdf.font('negrito')
						.fontSize(args.fontSizeTitulos)
						.text(titulos.dataVencimento, args.ajusteX + 332, args.ajusteY + tituloDaPrimeiraLinha, {
							lineBreak: false,
							width: 294,
							align: 'left'
						});
	
					pdf.font('normal')
						.fontSize(args.fontSizeTextos)
						.text(dataVencFormatado, args.ajusteX + 332, args.ajusteY + primeiraLinha, {
							lineBreak: false,
							width: 294,
							align: 'left'
						});
	
					pdf.font('negrito')
						.fontSize(args.fontSizeTitulos)
						.text('Valor Cobrado', args.ajusteX + 424, args.ajusteY + tituloDaPrimeiraLinha, {
							lineBreak: false,
							width: 294,
							align: 'left'
						});
	
					let primeiraLinhaOpcional = primeiraLinha + ESPACO_ENTRE_LINHAS,
						tituloDaPrimeiraLinhaOpcional = primeiraLinhaOpcional - diferencaEntreTituloEValor;
	
					if (modeloReciboPagador===2) {
						pdf.font('negrito')
							.fontSize(args.fontSizeTitulos)
							.text(titulos.carteira, args.ajusteX + 32, args.ajusteY + tituloDaPrimeiraLinhaOpcional, {
								lineBreak: false,
								width: 294,
								align: 'left'
							});
	
						pdf.font('normal')
							.fontSize(args.fontSizeTextos)
							.text(banco.getCarteiraTexto(beneficiario), args.ajusteX + 32, args.ajusteY + primeiraLinhaOpcional, {
								lineBreak: false,
								width: 40,
								align: 'left'
							});
	
						pdf.font('negrito')
							.fontSize(args.fontSizeTitulos)
							.text(titulos.especieDoc, args.ajusteX + 105, args.ajusteY + tituloDaPrimeiraLinhaOpcional, {
								lineBreak: false,
								width: 294,
								align: 'left'
							});
	
						pdf.font('normal')
							.fontSize(args.fontSizeTextos)
							.text(boleto.getEspecieDocumento(), args.ajusteX + 105, args.ajusteY + primeiraLinhaOpcional, {
								lineBreak: false,
								width: 40,
								align: 'left'
							});
	
						pdf.font('negrito')
							.fontSize(args.fontSizeTitulos)
							.text(titulos.numDocumento, args.ajusteX + 181, args.ajusteY + tituloDaPrimeiraLinhaOpcional, {
								lineBreak: false,
								width: 294,
								align: 'left'
							});
	
						pdf.font('normal')
							.fontSize(args.fontSizeTextos)
							.text(numDocFormatado, args.ajusteX + 181, args.ajusteY + primeiraLinhaOpcional, {
								lineBreak: false,
								width: 294,
								align: 'left'
							});
	
						pdf.font('negrito')
							.fontSize(args.fontSizeTitulos)
							.text(titulos.valorDocumento, args.ajusteX + 424, args.ajusteY + tituloDaPrimeiraLinhaOpcional, {
								lineBreak: false,
								width: 294,
								align: 'left'
							});
	
						pdf.font('normal')
							.fontSize(args.fontSizeTextos)
							.text(boleto.getValorFormatadoBRL(), args.ajusteX + 424, args.ajusteY + primeiraLinhaOpcional, {
								lineBreak: false,
								width: 294,
								align: 'left'
							});
					}
	
					let segundaLinha = modeloReciboPagador===2 ? primeiraLinhaOpcional + ESPACO_ENTRE_LINHAS : primeiraLinha + ESPACO_ENTRE_LINHAS,
						tituloDaSegundaLinha = segundaLinha - diferencaEntreTituloEValor;
	
					if (modeloReciboPagador===2) {
						pdf.font('negrito')
							.fontSize(args.fontSizeTitulos)
							.text(titulos.dataProcessamento, args.ajusteX + 332, args.ajusteY + tituloDaPrimeiraLinhaOpcional, {
								lineBreak: false,
								width: 294,
								align: 'left'
							});
	
						pdf.font('normal')
							.fontSize(args.fontSizeTextos)
							.text(dataProcFormatado, args.ajusteX + 332, args.ajusteY + primeiraLinhaOpcional, {
								lineBreak: false,
								width: 294,
								align: 'left'
							});
					}
	
					pdf.font('negrito')
						.fontSize(args.fontSizeTitulos)
						.text(titulos.agCodBeneficiario, args.ajusteX + 32, args.ajusteY + tituloDaSegundaLinha, {
							lineBreak: false,
							width: 294,
							align: 'left'
						});
	
					pdf.font('normal')
						.fontSize(args.fontSizeTextos)
						.text(agenciaCodBeneficiario, args.ajusteX + 32, args.ajusteY + segundaLinha, {
							lineBreak: false,
							width: 294,
							align: 'left'
						});
	
					pdf.font('negrito')
						.fontSize(args.fontSizeTitulos)
						.text(titulos.nossoNumero, args.ajusteX + 181, args.ajusteY + tituloDaSegundaLinha, {
							lineBreak: false,
							width: 294,
							align: 'left'
						});
	
					pdf.font('normal')
						.fontSize(args.fontSizeTextos)
						.text(nossoNumFormatado, args.ajusteX + 181, args.ajusteY + segundaLinha, {
							lineBreak: false,
							width: 294,
							align: 'left'
						});
	
					pdf.font('normal')
						.fontSize(7)
						.text('Autenticação Mecânica', args.ajusteX + 426, args.ajusteY + segundaLinha - 5, {
							lineBreak: false,
							width: 294,
							align: 'left'
						});

				}

				

				// TODO: QUEBRA DE LINHA

				posX = args.marginLeft;
				posY += args.alturaCampos*.666;

				pdf.moveTo(posX+10,posY)
					.lineTo(posX+args.larguraBoleto, posY)
					.dash(3, { space: 5 })
					.stroke(args.corLinhas)
					.undash()
					.restore();

				pdf.image(args.arquivoTesoura, posX, posY - 3.2, {
					width: 10
				});

				posX = args.marginLeft;
				posY += args.alturaCampos*.666;

				//////////////////////////////////////////////////////////////////////////////
				//////////////////////////	FICHA DE COMPENSACAO	//////////////////////////




				let espacamento = args.fontSizeTextos;
				let linha1 = 151+posY;
				let linha2 = linha1 + ESPACO_ENTRE_LINHAS;
				let linha3 = linha2 + ESPACO_ENTRE_LINHAS;
				let linha4Opcional = linha3 + ESPACO_ENTRE_LINHAS;
				let diferencaEntreTituloEValor = 10;

				

				//////////////////

				let margemDaLinhaSeparadora = 30,
					divisoresVerticais = (linha4Opcional || linha3) + (2 * margemDaLinhaSeparadora) - 4,
					margemDoSegundoBloco = 30,
					margemDoSegundoBlocoLayout = margemDoSegundoBloco - 4,
					alturaDoLogotipoDoBanco = 23;

				let linha21 = divisoresVerticais + alturaDoLogotipoDoBanco + 4;
				pdf.moveTo(args.ajusteX + margemDoSegundoBlocoLayout, args.ajusteY + linha21)
					.lineTo(args.ajusteX + 571, args.ajusteY + linha21)
					.stroke(args.corLinhas);

				let linha22 = linha21 + ESPACO_ENTRE_LINHAS + 8;
				pdf.moveTo(args.ajusteX + margemDoSegundoBlocoLayout, args.ajusteY + linha22)
					.lineTo(args.ajusteX + 571, args.ajusteY + linha22)
					.stroke(args.corLinhas);

				let linha23 = linha22 + ESPACO_ENTRE_LINHAS;
				pdf.moveTo(args.ajusteX + margemDoSegundoBlocoLayout, args.ajusteY + linha23)
					.lineTo(args.ajusteX + 571, args.ajusteY + linha23)
					.stroke(args.corLinhas);

				let linha24 = linha23 + ESPACO_ENTRE_LINHAS;
				pdf.moveTo(args.ajusteX + margemDoSegundoBlocoLayout, args.ajusteY + linha24)
					.lineTo(args.ajusteX + 571, args.ajusteY + linha24)
					.stroke(args.corLinhas);

				let linha25 = linha24 + ESPACO_ENTRE_LINHAS;
				pdf.moveTo(args.ajusteX + margemDoSegundoBlocoLayout, args.ajusteY + linha25)
					.lineTo(args.ajusteX + 571, args.ajusteY + linha25)
					.stroke(args.corLinhas);

				let camposLaterais = 434,
					linha26 = linha25 + ESPACO_ENTRE_LINHAS;

				pdf.moveTo(args.ajusteX + camposLaterais, args.ajusteY + linha26)
					.lineTo(args.ajusteX + 571, args.ajusteY + linha26)
					.stroke(args.corLinhas);

				let linha27 = linha26 + ESPACO_ENTRE_LINHAS;
				pdf.moveTo(args.ajusteX + camposLaterais, args.ajusteY + linha27)
					.lineTo(args.ajusteX + 571, args.ajusteY + linha27)
					.stroke(args.corLinhas);

				let linha28 = linha27 + ESPACO_ENTRE_LINHAS;
				pdf.moveTo(args.ajusteX + camposLaterais, args.ajusteY + linha28)
					.lineTo(args.ajusteX + 571, args.ajusteY + linha28)
					.stroke(args.corLinhas);

				if (args.exibirCampoUnidadeBeneficiaria) {
					let linha28_2 = linha28 + 12.4;
					pdf.moveTo(args.ajusteX + margemDoSegundoBlocoLayout, args.ajusteY + linha28_2)
						.lineTo(args.ajusteX + camposLaterais, args.ajusteY + linha28_2)
						.stroke(args.corLinhas);
				}

				let linha29 = linha28 + ESPACO_ENTRE_LINHAS;
				pdf.moveTo(args.ajusteX + camposLaterais, args.ajusteY + linha29)
					.lineTo(args.ajusteX + 571, args.ajusteY + linha29)
					.stroke(args.corLinhas);

				let linha211 = linha29 + ESPACO_ENTRE_LINHAS + 0.4;
				pdf.moveTo(args.ajusteX + margemDoSegundoBlocoLayout, args.ajusteY + linha211)
					.lineTo(args.ajusteX + 571, args.ajusteY + linha211)
					.stroke(args.corLinhas);

				let linha212 = linha211 + 56.6;
				pdf.moveTo(args.ajusteX + margemDoSegundoBlocoLayout, args.ajusteY + linha212)
					.lineTo(args.ajusteX + 571, args.ajusteY + linha212)
					.stroke(args.corLinhas);

				let coluna21 = margemDoSegundoBlocoLayout + 0.5;
				pdf.moveTo(args.ajusteX + coluna21, args.ajusteY + linha21)
					.lineTo(args.ajusteX + coluna21, args.ajusteY + linha212)
					.stroke(args.corLinhas);

				let coluna22 = 571 - 0.5;
				pdf.moveTo(args.ajusteX + coluna22, args.ajusteY + linha21)
					.lineTo(args.ajusteX + coluna22, args.ajusteY + linha212)
					.stroke(args.corLinhas);

				let coluna23 = camposLaterais;
				pdf.moveTo(args.ajusteX + coluna23, args.ajusteY + linha21)
					.lineTo(args.ajusteX + coluna23, args.ajusteY + linha211)
					.stroke(args.corLinhas);

				let coluna24 = 93.5;
				pdf.moveTo(args.ajusteX + coluna24, args.ajusteY + linha23)
					.lineTo(args.ajusteX + coluna24, args.ajusteY + linha24)
					.stroke(args.corLinhas);

				if (banco.exibirCampoCip()) {
					pdf.moveTo(args.ajusteX + coluna24, args.ajusteY + linha24)
						.lineTo(args.ajusteX + coluna24, args.ajusteY + linha25)
						.stroke(args.corLinhas);
				}

				let coluna25 = coluna24 + 92.5;
				pdf.moveTo(args.ajusteX + coluna25, args.ajusteY + linha23)
					.lineTo(args.ajusteX + coluna25, args.ajusteY + linha24)
					.stroke(args.corLinhas);

				let coluna26 = coluna25 + 84.5;
				pdf.moveTo(args.ajusteX + coluna26, args.ajusteY + linha23)
					.lineTo(args.ajusteX + coluna26, args.ajusteY + linha24)
					.stroke(args.corLinhas);

				let coluna27 = coluna26 + 61;
				pdf.moveTo(args.ajusteX + coluna27, args.ajusteY + linha23)
					.lineTo(args.ajusteX + coluna27, args.ajusteY + linha24)
					.stroke(args.corLinhas);

				let coluna28 = margemDoSegundoBlocoLayout + 106;
				pdf.moveTo(args.ajusteX + coluna28, args.ajusteY + linha24)
					.lineTo(args.ajusteX + coluna28, args.ajusteY + linha25)
					.stroke(args.corLinhas);

				let coluna29 = coluna28 + 76.5;
				pdf.moveTo(args.ajusteX + coluna29, args.ajusteY + linha24)
					.lineTo(args.ajusteX + coluna29, args.ajusteY + linha25)
					.stroke(args.corLinhas);

				let coluna210 = coluna29 + 77;
				pdf.moveTo(args.ajusteX + coluna210, args.ajusteY + linha24)
					.lineTo(args.ajusteX + coluna210, args.ajusteY + linha25)
					.stroke(args.corLinhas);

				let coluna211 = coluna210 + 92;
				pdf.moveTo(args.ajusteX + coluna211, args.ajusteY + linha24)
					.lineTo(args.ajusteX + coluna211, args.ajusteY + linha25)
					.stroke(args.corLinhas);

				let coluna212 = 154;
				pdf.moveTo(args.ajusteX + coluna212, args.ajusteY + divisoresVerticais)
					.lineTo(args.ajusteX + coluna212, args.ajusteY + linha21)
					.stroke(args.corLinhas);

				let coluna213 = coluna212 + 1;
				pdf.moveTo(args.ajusteX + coluna213, args.ajusteY + divisoresVerticais)
					.lineTo(args.ajusteX + coluna213, args.ajusteY + linha21)
					.stroke(args.corLinhas);

				let coluna214 = coluna213 + 1;
				pdf.moveTo(args.ajusteX + coluna214, args.ajusteY + divisoresVerticais)
					.lineTo(args.ajusteX + coluna214, args.ajusteY + linha21)
					.stroke(args.corLinhas);

				let coluna215 = coluna214 + 41.5;
				pdf.moveTo(args.ajusteX + coluna215, args.ajusteY + divisoresVerticais)
					.lineTo(args.ajusteX + coluna215, args.ajusteY + linha21)
					.stroke(args.corLinhas);

				let coluna216 = coluna215 + 1;
				pdf.moveTo(args.ajusteX + coluna216, args.ajusteY + divisoresVerticais)
					.lineTo(args.ajusteX + coluna216, args.ajusteY + linha21)
					.stroke(args.corLinhas);

				let coluna217 = coluna216 + 1;
				pdf.moveTo(args.ajusteX + coluna217, args.ajusteY + divisoresVerticais)
					.lineTo(args.ajusteX + coluna217, args.ajusteY + linha21)
					.stroke(args.corLinhas);

				let linhaSeparadora = (linha4Opcional || linha3) + margemDaLinhaSeparadora;


				

				/// IMPRIMIR LAYOUT
				

				args.creditos && pdf.font('italico')
					.fontSize(8)
					.text(args.creditos, args.ajusteX + 3, args.ajusteY + 90 + posY, {
						width: 560,
						align: 'center'
					});

				

				let segundaLinha2 = linha21 - 20.25;

				pdf.image(logoBanco, args.ajusteX + margemDoSegundoBlocoLayout, args.ajusteY + segundaLinha2 - 5, {
					height: alturaDoLogotipoDoBanco
				});

				banco.getImprimirNome() && pdf.font('negrito')
					.fontSize(args.fontSizeLinhaDigitavel)
					.text(nomeBanco, args.ajusteX + margemDoSegundoBlocoLayout + 26, args.ajusteY + segundaLinha2, {
						lineBreak: false,
						width: 100,
						align: 'left'
					});

				pdf.font('negrito')
					.fontSize(args.fontSizeLinhaDigitavel)
					.text(banco.getNumeroFormatadoComDigito(), args.ajusteX + margemDoSegundoBlocoLayout + 131, args.ajusteY + segundaLinha2, {
						lineBreak: false,
						width: 39.8,
						align: 'center'
					});

				pdf.font('negrito')
					.fontSize(args.fontSizeLinhaDigitavel)
					.text(linhaDigitavel, args.ajusteX + margemDoSegundoBlocoLayout + 145, args.ajusteY + segundaLinha2, {
						lineBreak: false,
						width: 400,
						align: 'right'
					});

				function i25(text) { // TODO: MUDAR PARA O GAMMAUTILS ASAP
					if (text.length % 2 !== 0) {
						throw new Error('Text must have an even number of characters');
					}

					const start = String.fromCharCode(201),
						stop = String.fromCharCode(202);

					return text.match(/.{2}/g).reduce(function(acc, part) {
						let value = parseInt(part, 10),
							ascii;

						if (value >= 0 && value <= 93) {
							ascii = value + 33;
						}

						if (value >= 94 && value <= 99) {
							ascii = value + 101;
						}

						return acc + String.fromCharCode(ascii);
					}, start) + stop;
				}

				pdf.font('codigoDeBarras')
					.fontSize(args.alturaCodBarras)
					.text(i25(codigoDeBarras), args.ajusteX + margemDoSegundoBlocoLayout, args.ajusteY + linha212 + 3.5, {
						lineBreak: false,
						width: 340,
						align: 'left'
					});

				let terceiraLinha = segundaLinha2 + 38,
					tituloDaTerceiraLinha = terceiraLinha - diferencaEntreTituloEValor,
					tituloDaTerceiraLinhaLateral = terceiraLinha - diferencaEntreTituloEValor,
					colunaLateral = 440;

				let tituloLocalDoPagamento = margemDoSegundoBloco;
				pdf.font('negrito')
					.fontSize(args.fontSizeTitulos)
					.text(titulos.localDoPagamento, args.ajusteX + tituloLocalDoPagamento, args.ajusteY + tituloDaTerceiraLinha - 7, {
						lineBreak: false,
						width: 294,
						align: 'left'
					});

				boleto.getLocaisDePagamento().forEach(function(localDePagamento, indice) {
					if (indice > 1) {
						return;
					}

					pdf.font('normal')
						.fontSize(args.fontSizeTitulos)
						.text(localDePagamento, args.ajusteX + margemDoSegundoBloco, args.ajusteY + (terceiraLinha + 2 - args.fontSizeTextos + (indice * args.fontSizeTextos)), {
							lineBreak: false,
							width: 400,
							align: 'left'
						});
				});

				let tamanhoDasCelulasADireita = 124.5;

				pdf.font('negrito')
					.fontSize(args.fontSizeTitulos)
					.text('Vencimento', args.ajusteX + colunaLateral, args.ajusteY + tituloDaTerceiraLinhaLateral - 7, {
						lineBreak: false,
						width: tamanhoDasCelulasADireita,
						align: 'left'
					});

				pdf.font('normal')
					.fontSize(args.fontSizeTextos)
					.text(dataVencFormatado, args.ajusteX + colunaLateral, args.ajusteY + terceiraLinha, {
						lineBreak: false,
						width: tamanhoDasCelulasADireita,
						align: 'right'
					});

				let quartaLinha = terceiraLinha + 24,
					tituloDaQuartaLinhaLateral = quartaLinha - diferencaEntreTituloEValor;

				let tituloBeneficiario = margemDoSegundoBloco;
				pdf.font('negrito')
					.fontSize(args.fontSizeTitulos)
					.text('Beneficiário', args.ajusteX + tituloBeneficiario, args.ajusteY + tituloDaQuartaLinhaLateral, {
						lineBreak: false,
						width: 294,
						align: 'left'
					});

				pdf.font('normal')
					.fontSize(args.fontSizeTextos)
					.text(identificacaoBeneficiario, args.ajusteX + margemDoSegundoBloco, args.ajusteY + quartaLinha, {
						lineBreak: false,
						width: 400,
						align: 'left'
					});

				pdf.font('negrito')
					.fontSize(args.fontSizeTitulos)
					.text(titulos.agCodBeneficiario, args.ajusteX + colunaLateral, args.ajusteY + tituloDaQuartaLinhaLateral, {
						lineBreak: false,
						width: tamanhoDasCelulasADireita,
						align: 'left'
					});

				pdf.font('normal')
					.fontSize(args.fontSizeTextos)
					.text(agenciaCodBeneficiario, args.ajusteX + colunaLateral, args.ajusteY + quartaLinha, {
						lineBreak: false,
						width: tamanhoDasCelulasADireita,
						align: 'right'
					});

				let quintaLinha = quartaLinha + ESPACO_ENTRE_LINHAS,
					tituloDaQuintaLinha = quintaLinha - diferencaEntreTituloEValor,
					tituloDaQuintaLinhaLateral = quintaLinha - diferencaEntreTituloEValor;

				let tituloDataDocumento = margemDoSegundoBloco;
				pdf.font('negrito')
					.fontSize(args.fontSizeTitulos)
					.text(titulos.dataDocumento, args.ajusteX + tituloDataDocumento, args.ajusteY + tituloDaQuintaLinha, {
						lineBreak: false,
						width: 294,
						align: 'left'
					});

				pdf.font('normal')
					.fontSize(args.fontSizeTextos)
					.text(dataDocFormatado, args.ajusteX + margemDoSegundoBloco, args.ajusteY + quintaLinha, {
						lineBreak: false,
						width: 61.5,
						align: 'left'
					});

				pdf.font('normal')
					.fontSize(args.fontSizeTextos)
					.text(boleto.getNumeroDoDocumentoFormatado(), args.ajusteX + margemDoSegundoBloco + 68, args.ajusteY + quintaLinha, {
						lineBreak: false,
						width: 84,
						align: 'left'
					});

				let tituloNumeroDoDocumento = tituloDataDocumento + 68,
					tituloCip = tituloNumeroDoDocumento;

				pdf.font('negrito')
					.fontSize(args.fontSizeTitulos)
					.text(titulos.numDocumento, args.ajusteX + tituloNumeroDoDocumento, args.ajusteY + tituloDaQuintaLinha, {
						lineBreak: false,
						width: 294,
						align: 'left'
					});

				let tituloEspecieDoc = tituloNumeroDoDocumento + 90;
				pdf.font('negrito')
					.fontSize(args.fontSizeTitulos)
					.text(titulos.especieDoc, args.ajusteX + tituloEspecieDoc, args.ajusteY + tituloDaQuintaLinha, {
						lineBreak: false,
						width: 294,
						align: 'left'
					});

				pdf.font('normal')
					.fontSize(args.fontSizeTextos)
					.text(boleto.getEspecieDocumento(), args.ajusteX + margemDoSegundoBloco + 68 + 90, args.ajusteY + quintaLinha, {
						lineBreak: false,
						width: 81,
						align: 'center'
					});

				let tituloAceite = tituloEspecieDoc + 86;
				pdf.font('negrito')
					.fontSize(args.fontSizeTitulos)
					.text('Aceite', args.ajusteX + tituloAceite, args.ajusteY + tituloDaQuintaLinha, {
						lineBreak: false,
						width: 294,
						align: 'left'
					});

				pdf.font('normal')
					.fontSize(args.fontSizeTextos)
					.text(aceiteFormatado, args.ajusteX + margemDoSegundoBloco + 68 + 90 + 86, args.ajusteY + quintaLinha, {
						lineBreak: false,
						width: 55,
						align: 'center'
					});

				pdf.font('normal')
					.fontSize(args.fontSizeTextos)
					.text(dataProcFormatado, args.ajusteX + margemDoSegundoBloco + 68 + 90 + 86 + 61.5, args.ajusteY + quintaLinha, {
						lineBreak: false,
						width: 93.5,
						align: 'left'
					});

				let tituloDataProcessamento = tituloAceite + 61;
				pdf.font('negrito')
					.fontSize(args.fontSizeTitulos)
					.text(titulos.dataProcessamento, args.ajusteX + tituloDataProcessamento, args.ajusteY + tituloDaQuintaLinha, {
						lineBreak: false,
						width: 294,
						align: 'left'
					});

				pdf.font('negrito')
					.fontSize(args.fontSizeTitulos)
					.text(titulos.nossoNumero, args.ajusteX + colunaLateral, args.ajusteY + tituloDaQuintaLinhaLateral, {
						lineBreak: false,
						width: 294,
						align: 'left'
					});

				pdf.font('normal')
					.fontSize(args.fontSizeTextos)
					.text(banco.getNossoNumeroECodigoDocumento(boleto), args.ajusteX + colunaLateral, args.ajusteY + quintaLinha, {
						lineBreak: false,
						width: tamanhoDasCelulasADireita,
						align: 'right'
					});

				let sextaLinha = quintaLinha + ESPACO_ENTRE_LINHAS,
					tituloDaSextaLinha = sextaLinha - diferencaEntreTituloEValor;

				let tituloUsoDoBancoX = margemDoSegundoBloco;
				pdf.font('negrito')
					.fontSize(args.fontSizeTitulos)
					.text('Uso do Banco', args.ajusteX + tituloUsoDoBancoX, args.ajusteY + tituloDaSextaLinha, {
						lineBreak: false,
						width: 294,
						align: 'left'
					});

				if (banco.exibirCampoCip()) {
					pdf.font('negrito')
						.fontSize(args.fontSizeTitulos)
						.text('CIP', args.ajusteX + tituloCip, args.ajusteY + tituloDaSextaLinha, {
							lineBreak: false,
							width: 31,
							align: 'left'
						});

					// TODO: Implementar campo CIP no boleto
					pdf.font('normal')
						.fontSize(args.fontSizeTextos)
						.text('', args.ajusteX + tituloCip, args.ajusteY + sextaLinha, {
							lineBreak: false,
							width: 31,
							align: 'center'
						});
				}

				let tituloCarteira = tituloUsoDoBancoX + 105;
				pdf.font('negrito')
					.fontSize(args.fontSizeTitulos)
					.text(titulos.carteira, args.ajusteX + tituloCarteira, args.ajusteY + tituloDaSextaLinha, {
						lineBreak: false,
						width: 294,
						align: 'left'
					});

				pdf.font('normal')
					.fontSize(args.fontSizeTextos)
					.text(banco.getCarteiraTexto(beneficiario), args.ajusteX + margemDoSegundoBloco + 104.5, args.ajusteY + sextaLinha, {
						lineBreak: false,
						width: 71,
						align: 'center'
					});

				pdf.font('normal')
					.fontSize(args.fontSizeTextos)
					.text(boleto.getEspecieMoeda(), args.ajusteX + margemDoSegundoBloco + 104.5 + 77, args.ajusteY + sextaLinha, {
						lineBreak: false,
						width: 71,
						align: 'center'
					});

				let tituloEspecieMoeda = tituloCarteira + 77;
				pdf.font('negrito')
					.fontSize(args.fontSizeTitulos)
					.text(titulos.especie, args.ajusteX + tituloEspecieMoeda, args.ajusteY + tituloDaSextaLinha, {
						lineBreak: false,
						width: 294,
						align: 'left'
					});

				let tituloQuantidadeMoeda = tituloEspecieMoeda + 77;
				pdf.font('negrito')
					.fontSize(args.fontSizeTitulos)
					.text(titulos.quantidade, args.ajusteX + tituloQuantidadeMoeda, args.ajusteY + tituloDaSextaLinha, {
						lineBreak: false,
						width: 294,
						align: 'left'
					});

				let tituloValorMoeda = tituloQuantidadeMoeda + 92;
				pdf.font('negrito')
					.fontSize(args.fontSizeTitulos)
					.text(titulos.valor, args.ajusteX + tituloValorMoeda, args.ajusteY + tituloDaSextaLinha, {
						lineBreak: false,
						width: 294,
						align: 'left'
					});

				pdf.font('negrito')
					.fontSize(args.fontSizeTitulos)
					.text(titulos.igualDoValorDoDocumento + titulos.valorDocumento, args.ajusteX + colunaLateral, args.ajusteY + tituloDaSextaLinha, {
						lineBreak: false,
						width: tamanhoDasCelulasADireita,
						align: 'left'
					});

				pdf.font('normal')
					.fontSize(args.fontSizeTextos)
					.text(boleto.getValorFormatadoBRL(), args.ajusteX + colunaLateral, args.ajusteY + sextaLinha, {
						lineBreak: false,
						width: tamanhoDasCelulasADireita,
						align: 'right'
					});

				let setimaLinhaLateral = sextaLinha + ESPACO_ENTRE_LINHAS,
					tituloDaSetimaLinha = tituloDaSextaLinha + ESPACO_ENTRE_LINHAS,
					tituloDaSetimaLinhaLateral = setimaLinhaLateral - diferencaEntreTituloEValor;

				pdf.font('negrito')
					.fontSize(args.fontSizeTitulos)
					.text(titulos.instrucoes, args.ajusteX + margemDoSegundoBloco, args.ajusteY + tituloDaSetimaLinha, {
						lineBreak: false,
						width: 294,
						align: 'left'
					});

				let instrucaoY = tituloDaSetimaLinha + 12;
				instrucoes.forEach(function(instrucao, indice) {
					pdf.font('normal')
						.fontSize(args.fontSizeTextos)
						.text(instrucao, args.ajusteX + margemDoSegundoBloco, args.ajusteY + instrucaoY + (indice * args.fontSizeTextos), {
							lineBreak: false,
							width: 400,
							align: 'left'
						});
				});

				if (args.exibirCampoUnidadeBeneficiaria) {
					pdf.font('negrito')
						.fontSize(args.fontSizeTitulos)
						.text('Unidade Beneficiária', args.ajusteX + 30, args.ajusteY + tituloDaSetimaLinha + 70, {
							lineBreak: false,
							width: 294,
							align: 'left'
						});
				}

				pdf.font('negrito')
					.fontSize(args.fontSizeTitulos)
					.text('Pagador', args.ajusteX + 30, args.ajusteY + tituloDaSetimaLinha + 115, {
						lineBreak: false,
						width: 294,
						align: 'left'
					});

				pdf.font('normal')
					.fontSize(args.fontSizeTextos)
					.text(pagador.getIdentificacao(), args.ajusteX + 30, args.ajusteY + tituloDaSetimaLinha + 115 + 10, {
						lineBreak: false,
						width: 535,
						align: 'left'
					});

				if (enderecoPagador) {
					let espacamento = args.fontSizeTextos;

					if (enderecoPagador.getPrimeiraLinha()) {
						pdf.font('normal')
							.fontSize(args.fontSizeTextos)
							.text(enderecoPagador.getPrimeiraLinha(), args.ajusteX + 30, args.ajusteY + tituloDaSetimaLinha + 115 + 10 + espacamento, {
								lineBreak: false,
								width: 535,
								align: 'left'
							});

						espacamento += espacamento;
					}

					if (enderecoPagador.getSegundaLinha()) {
						pdf.font('normal')
							.fontSize(args.fontSizeTextos)
							.text(enderecoPagador.getSegundaLinha(), args.ajusteX + 30, args.ajusteY + tituloDaSetimaLinha + 115 + 10 + espacamento, {
								lineBreak: false,
								width: 535,
								align: 'left'
							});
					}
				}

				pdf.font('negrito')
					.fontSize(args.fontSizeTitulos)
					.text('Código de Baixa', args.ajusteX + 370, args.ajusteY + tituloDaSetimaLinha + 159, {
						lineBreak: false,
						width: 294,
						align: 'left'
					});

				pdf.font('negrito')
					.fontSize(args.fontSizeTitulos)
					.text('Autenticação Mecânica', args.ajusteX + 360, args.ajusteY + tituloDaSetimaLinha + 171.5, {
						lineBreak: false,
						width: 294,
						align: 'left'
					});

				pdf.font('negrito')
					.fontSize(args.fontSizeTitulos + 1)
					.text('FICHA DE COMPENSAÇÃO', args.ajusteX + 421, args.ajusteY + tituloDaSetimaLinha + 171.5, {
						lineBreak: false,
						width: 150,
						align: 'right'
					});

				pdf.font('negrito')
					.fontSize(args.fontSizeTitulos)
					.text('(-) Desconto / Abatimento', args.ajusteX + colunaLateral, args.ajusteY + tituloDaSetimaLinhaLateral, {
						lineBreak: false,
						width: tamanhoDasCelulasADireita,
						align: 'left'
					});

				pdf.font('normal')
					.fontSize(args.fontSizeTextos)
					.text(boleto.getValorDescontosFormatadoBRL(), args.ajusteX + colunaLateral, args.ajusteY + setimaLinhaLateral, {
						lineBreak: false,
						width: tamanhoDasCelulasADireita,
						align: 'right'
					});

				let oitavaLinhaLateral = setimaLinhaLateral + ESPACO_ENTRE_LINHAS,
					tituloDaOitavaLinhaLateral = oitavaLinhaLateral - diferencaEntreTituloEValor;

				pdf.font('negrito')
					.fontSize(args.fontSizeTitulos)
					.text('(-) Outras Deduções', args.ajusteX + colunaLateral, args.ajusteY + tituloDaOitavaLinhaLateral, {
						lineBreak: false,
						width: 294,
						align: 'left'
					});

				pdf.font('normal')
					.fontSize(args.fontSizeTextos)
					.text(boleto.getValorDeducoesFormatadoBRL(), args.ajusteX + colunaLateral, args.ajusteY + oitavaLinhaLateral, {
						lineBreak: false,
						width: 294,
						align: 'right'
					});

				let nonaLinhaLateral = oitavaLinhaLateral + ESPACO_ENTRE_LINHAS,
					tituloDaNonaLinhaLateral = nonaLinhaLateral - diferencaEntreTituloEValor;

				pdf.font('negrito')
					.fontSize(args.fontSizeTitulos)
					.text(titulos.moraMulta, args.ajusteX + colunaLateral, args.ajusteY + tituloDaNonaLinhaLateral, {
						lineBreak: false,
						width: 294,
						align: 'left'
					});

				let decimaLinhaLateral = nonaLinhaLateral + ESPACO_ENTRE_LINHAS,
					tituloDaDecimaLinhaLateral = decimaLinhaLateral - diferencaEntreTituloEValor;

				pdf.font('negrito')
					.fontSize(args.fontSizeTitulos)
					.text('(+) Outros Acréscimos', args.ajusteX + colunaLateral, args.ajusteY + tituloDaDecimaLinhaLateral, {
						lineBreak: false,
						width: 294,
						align: 'left'
					});

				let decimaPrimLinhaLateral = decimaLinhaLateral + ESPACO_ENTRE_LINHAS,
					tituloDaDecimaPrimLinhaLateral = decimaPrimLinhaLateral - diferencaEntreTituloEValor;

				pdf.font('negrito')
					.fontSize(args.fontSizeTitulos)
					.text('(=) Valor Cobrado', args.ajusteX + colunaLateral, args.ajusteY + tituloDaDecimaPrimLinhaLateral, {
						lineBreak: false,
						width: 294,
						align: 'left'
					});

				// args.imprimirSequenciaDoBoleto && pdf.font('italico')
				//  .fontSize(args.fontSizeTextos)
				//  .text('Boleto Nº ' + (indice + 1) + '/' + boletos.length, args.ajusteX + 30, args.ajusteY + 10, {
				//      width: 560,
				//      align: 'center'
				//  });

				informacoesPersonalizadas(pdf, args.ajusteX + margemDoSegundoBlocoLayout, args.ajusteY + linha212 + args.alturaCodBarras + 10);

				if (indice < boletos.length - 1) {
					pdf.addPage();
				}
			});

			if(args.base64){
				
				let finalString = ''; 
				let stream = pdf.pipe(new Base64Encode());
	
				pdf.end();
	
				stream.on('data', function(chunk) {
					finalString += chunk;
				});
				
				stream.on('end', function() {
					resolve(finalString);
				});
			}else{
				pdf.end();
				resolve(pdf);
			}
		});
	};

	GeradorDeBoleto.prototype.gerarLinhaDigitavel = function() {
		return new Promise((resolve)=> {
			const boletos = this._boletos;
			const linhaDigitavel = [];
			boletos.forEach((boleto, indice)=> {
				const banco = boleto.getBanco();
				const numeroDocumento = boleto.getNumeroDoDocumentoFormatado();
				const linha = GeradorDeLinhaDigitavel(banco.geraCodigoDeBarrasPara(boleto), banco)
				if (indice <= boletos.length - 1) {
					linhaDigitavel.push({linha, numeroDocumento});
				}
			});
			resolve(linhaDigitavel);
		});
	};
	
	GeradorDeBoleto.prototype.gerarHTML = function() {
		throw new Error('Não implementado!');
	};

	return GeradorDeBoleto;
})();

module.exports = GeradorDeBoleto;
