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
		marginBottom: 70,
		fontSizeTitulos: 7.222,
		fontSizeTextos: 9.666, //10
		fontSizeLinhaDigitavel: 12.6,
		fontSizeCodBarras: 32,
		fontSizeRodape: 7.222,
		larguraBoleto:544,
		larguraCamposDireita:136,
		larguraCodigoBarras: 324,
		alturaCampos: 23,
		alturaCamposExtra: 29, // +25% campo normal
		paddingCampos: 2.666,
		larguraLogoBanco: 126,
		limiteReciboPagador: 746, // alturaPagina - altura do recibo do final do recibo do boleto (95),
		limiteFichaCompensacao: 495, // alturaPagina - altura da ficha de compensacao (345),
		imprimirSequenciaDoBoleto: true,
		corLinhas: '#1c1c1c',
		corLinhasSuaves: '#555555',
		corCourier: '#2c2c2c',
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

			pdf.registerFont('courier', 'Courier-Bold');
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
				const cidadePagador = enderecoPagador.getCidade().trim();
				const enderecoCurtoPagador = enderecoPagador.getPrimeiraLinha().trim() + (cidadePagador ? ', '+cidadePagador : '');
				const ufPagador = enderecoPagador.getUf().trim();
				const cepPagador = enderecoPagador.getCepFormatado().trim();
				const sacadorAvalista = boleto.getSacadorAvalista();
				const regNacSacAvalistaFormatado = sacadorAvalista ? sacadorAvalista.getRegistroNacionalFormatado() : '';
				const nomeSacadorAvalista = sacadorAvalista ? sacadorAvalista.getNome().trim() : '';
				const beneficiario = boleto.getBeneficiario();
				const aceiteFormatado = boleto.getAceiteFormatado();
				const carteiraTexto = banco.getCarteiraTexto(beneficiario);
				const identificacaoBeneficiario = beneficiario.getIdentificacao();
				const nomeBeneficiario = beneficiario.getNome().trim();
				const regNacBenefFormatado = beneficiario.getRegistroNacionalFormatado();
				const enderecoBeneficiario = beneficiario.getEndereco();
				const cidadeBeneficiario = enderecoBeneficiario.getCidade().trim();
				const enderecoCurtoBeneficiario = enderecoBeneficiario.getPrimeiraLinha().trim() + (cidadeBeneficiario ? ', '+cidadeBeneficiario : '');
				const ufBeneficiario = enderecoBeneficiario.getUf().trim();
				const cepBeneficiario = enderecoBeneficiario.getCepFormatado().trim();
				const agenciaCodBeneficiario = banco.getAgenciaECodigoBeneficiario(boleto);
				const datas = boleto.getDatas();
				const dataDocFormatado = datas.getDocumentoFormatado();
				const dataVencFormatado = datas.getVencimentoFormatado();
				const dataProcFormatado = datas.getProcessamentoFormatado();
				const numDocFormatado = StringUtils.pad(boleto.getNumeroDoDocumentoFormatado(boleto), 8, '0');
				const nossoNumFormatado = StringUtils.pad(banco.getNossoNumeroECodigoDocumento(boleto), 8, '0');
				const modeloReciboPagador = banco.modeloReciboDoPagador();
				const especieMoeda = boleto.getEspecieMoeda();
				const quantidadeMoeda = boleto.getQuantidadeDeMoeda();
				const valorDocFormatado = boleto.getValorFormatadoBRL();
				const valorDescFormatado = boleto.getValorDescontosFormatadoBRL();
				const valorMoraMultaFormatado = boleto.getValorMultaFormatadoBRL();
				const valorDeducoesFormatado = boleto.getValorDeducoesFormatadoBRL();
				const valorAcrescimosFormatado = boleto.getValorAcrescimosFormatadoBRL();
				const valorCobrado = '';
				const instrucoes = boleto.getInstrucoes();
				const descricoes = boleto.getDescricoes();
				const locaisPagamento = boleto.getLocaisDePagamento();
				const txtLivreRodapeRecPag = banco.getTextoLivreRodapeReciboPagador();

				const titulos = ObjectUtils.merge({
					beneficiario: 'Beneficiário',
					sacadorAvalista: 'Sacador/Avalista',
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
					especieDoc: 'Espécie DOC.',
					especieMoeda: 'Espécie Moeda',
					usoBanco: 'Uso do Banco',
					quantidade: 'Quantidade',
					numDocumento: 'Nº do Documento',
					vencimento: 'Vencimento',
					dataVencimento: 'Data de Vencimento',
					dataProcessamento: 'Data Processamento',
					valorDocumento: 'Valor do Documento',
					desconto: 'Desconto',
					deducoes: 'Outras Deduções / Abatimentos',
					acrescimos: 'Outros Acréscimos',
					valorCobrado: 'Valor Cobrado',
					valor: 'Valor',
					carteira: 'Carteira',
					moraMulta: 'Mora / Multa / Juros',
					localPagamento: 'Local de Pagamento',
					mais: '(+)',
					menos: '(-)',
					igual: '(=) ',
					autentMecanica: 'Autenticação Mecânica',
					reciboPagador: 'RECIBO DO PAGADOR',
					fichaCompensacao: 'FICHA DE COMPENSAÇÃO',
				}, banco.getTitulos ? banco.getTitulos() : {});

				const ESPACO_ENTRE_LINHAS = 23;

				const textosCampoBasico = (tit, txt, x, y, width, height = args.alturaCampos, align = 'left', padding = args.paddingCampos, destacado = false) =>{
					return(
						pdf.font('negrito')
							.fontSize(args.fontSizeTitulos)
							.text(tit, x + args.paddingCampos, y + args.paddingCampos, {
								lineBreak: false,
								width: width - args.paddingCampos*2,
								height: height - args.paddingCampos,
								align: 'left'
							})
							.font(!destacado ? 'normal' : 'negrito')
							.fontSize(!destacado ? args.fontSizeTextos : args.fontSizeTextos*1.125)
							.text(txt, x + padding, y + args.fontSizeTitulos + args.paddingCampos*1.75, {
								lineBreak: false,
								width: width - padding*2,
								height: height - args.paddingCampos,
								align: align
							})
					);
				}

				const i25 = text =>{ // TODO: MUDAR PARA O GAMMAUTILS ASAP
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
				};
				
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
							height: args.fontSizeLinhaDigitavel,
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
							height: args.fontSizeLinhaDigitavel,
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
							height: args.fontSizeLinhaDigitavel,
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
						posX, posY, widthCampo, args.alturaCampos, 'left'
					);
					
					posX += widthCampo;
					pdf.moveTo(posX, posY).lineTo(posX, posY+args.alturaCampos).stroke(args.corLinhas);
					
					widthCampo = args.marginLeft+args.larguraBoleto-posX-args.larguraCamposDireita;
					textosCampoBasico(
						titulos.cpfCnpj, 
						regNacBenefFormatado, 
						posX, posY, widthCampo, args.alturaCampos, 'left'
					);

					posX += widthCampo;
					pdf.moveTo(posX, posY).lineTo(posX, posY+args.alturaCampos).stroke(args.corLinhas);

					widthCampo = args.larguraCamposDireita;

					textosCampoBasico(
						titulos.agCodBeneficiario, 
						agenciaCodBeneficiario, 
						posX, posY, widthCampo, args.alturaCampos, 'left'
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
						posX, posY, widthCampo, args.alturaCampos, 'left'
					);
					
					posX += widthCampo;
					pdf.moveTo(posX, posY).lineTo(posX, posY+args.alturaCampos).stroke(args.corLinhas);
					
					widthCampo = args.marginLeft+args.larguraBoleto-posX-args.larguraCamposDireita;
					textosCampoBasico(
						titulos.uf, 
						ufBeneficiario, 
						posX, posY, widthCampo, args.alturaCampos, 'center'
					);

					posX += widthCampo;
					pdf.moveTo(posX, posY).lineTo(posX, posY+args.alturaCampos).stroke(args.corLinhas);

					widthCampo = args.larguraCamposDireita;

					textosCampoBasico(
						titulos.cep, 
						cepBeneficiario, 
						posX, posY, widthCampo, args.alturaCampos, 'left'
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
						posX, posY, widthCampo, args.alturaCampos, 'left'
					);

					posX += widthCampo;
					pdf.moveTo(posX, posY).lineTo(posX, posY+args.alturaCampos).stroke(args.corLinhas);

					widthCampo = 120;
					textosCampoBasico(
						titulos.numDocumento, 
						numDocFormatado, 
						posX, posY, widthCampo, args.alturaCampos, 'left'
					);
					
					posX += widthCampo;
					pdf.moveTo(posX, posY).lineTo(posX, posY+args.alturaCampos).stroke(args.corLinhas);
					
					widthCampo = 60;
					textosCampoBasico(
						titulos.aceite, 
						aceiteFormatado, 
						posX, posY, widthCampo, args.alturaCampos, 'center'
					);

					posX += widthCampo;
					pdf.moveTo(posX, posY).lineTo(posX, posY+args.alturaCampos).stroke(args.corLinhas);
					
					widthCampo = args.marginLeft+args.larguraBoleto-posX-args.larguraCamposDireita;
					textosCampoBasico(
						titulos.dataProcessamento, 
						dataProcFormatado,
						posX, posY, widthCampo, args.alturaCampos, 'left'
					);

					posX += widthCampo;
					pdf.moveTo(posX, posY).lineTo(posX, posY+args.alturaCampos).stroke(args.corLinhas);

					widthCampo = args.larguraCamposDireita;

					textosCampoBasico(
						titulos.nossoNumero, 
						nossoNumFormatado, 
						posX, posY, widthCampo, args.alturaCampos, 'left'
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
							height: args.fontSizeTitulos,
							align: 'left'
						});
						
					posX = args.marginLeft + args.larguraBoleto;
					pdf.moveTo(posX, posY).lineTo(posX, posY+args.fontSizeTitulos+args.paddingCampos*2).stroke(args.corLinhas);

					posY += (args.fontSizeTitulos+args.paddingCampos*2);

					instrucoes.forEach(function(instrucao, indice) {
						posX = args.marginLeft;
						pdf.moveTo(posX, posY).lineTo(posX, posY+args.fontSizeTitulos+args.paddingCampos).stroke(args.corLinhas);

						pdf.font('normal')
							.fontSize(args.fontSizeTextos*.966)
							.text(String(instrucao).trim(), posX+args.paddingCampos, posY+args.paddingCampos, {
								lineBreak: false,
								width: widthCampo-(args.paddingCampos*2),
								height: args.fontSizeTextos,
								align: 'left'
							});

						posX = args.marginLeft+args.larguraBoleto;
						pdf.moveTo(posX, posY).lineTo(posX, posY+args.fontSizeTitulos+args.paddingCampos).stroke(args.corLinhas);
						posY += args.fontSizeTitulos+args.paddingCampos;

						if(indice == instrucoes.length-1){
							posX = args.marginLeft;
							pdf.moveTo(posX, posY).lineTo(posX, posY+args.paddingCampos*2).stroke(args.corLinhas);
							posX = args.marginLeft + args.larguraBoleto;
							pdf.moveTo(posX, posY).lineTo(posX, posY+args.paddingCampos*2).stroke(args.corLinhas);
							posY += args.paddingCampos*2;
						}
						
					});

					// DESCRICOES EM 2 COLUNAS
					let descrCol1 = descricoes.slice(0, Math.ceil(descricoes.length/2));
					let descrCol2 = descricoes.slice(Math.ceil(descricoes.length/2));

					for(let i=0; i<descrCol1.length || i<descrCol2.length ; i++){
						posX = args.marginLeft;
						pdf.moveTo(posX, posY).lineTo(posX, posY+args.fontSizeTextos + args.paddingCampos).stroke(args.corLinhas);

						if(descrCol1[i].trim()){
							pdf.font('courier')
								.fillColor(args.corCourier)
								.fontSize(args.fontSizeTextos*.966)
								.text(descrCol1[i].trim(), posX + args.paddingCampos, posY, {
									lineBreak: false,
									width: widthCampo/2 - args.paddingCampos*2,
									height: args.fontSizeTextos+args.paddingCampos,
									align: 'left'
								});
						}
						
						if(descrCol2[i].trim()){
							pdf.font('courier')
								.fontSize(args.fontSizeTextos*.966)
								.text(descrCol2[i].trim(), posX + widthCampo/2 + args.paddingCampos, posY, {
									lineBreak: false,
									width: widthCampo/2 - args.paddingCampos*2,
									height: args.fontSizeTextos+args.paddingCampos,
									align: 'left'
								});
						}

						pdf.fillColor(args.corLinhas);

						posX = args.marginLeft + args.larguraBoleto;
						pdf.moveTo(posX, posY).lineTo(posX, posY+args.fontSizeTextos + args.paddingCampos).stroke(args.corLinhas);

						posY += (args.fontSizeTextos+args.paddingCampos/2);

						// VERIFICAR QUEBRA DE PAGINA
						if(posY > args.alturaPagina-args.marginBottom-args.fontSizeTextos-args.paddingCampos){
							pdf.restore().save().addPage();
							posY = args.marginTop;
						}
					}

					posX = args.marginLeft;
					pdf.moveTo(posX, posY).lineTo(posX, posY+args.paddingCampos+(descricoes.length==0 ? args.alturaCampos : 0)).stroke(args.corLinhas);
					posX = args.marginLeft + args.larguraBoleto;
					pdf.moveTo(posX, posY).lineTo(posX, posY+args.paddingCampos+(descricoes.length==0 ? args.alturaCampos : 0)).stroke(args.corLinhas);

					// VERIFICAR QUEBRA DE PAGINA
					if(posY > args.limiteReciboPagador-args.marginBottom){
						pdf.restore().save().addPage();
						posY = args.marginTop;
					}

					// LINHA 6
					
					posX = args.marginLeft;
					posY += args.paddingCampos+(descricoes.length==0 ? args.alturaCampos : 0);
					widthCampo = args.larguraBoleto-args.larguraCamposDireita;
					pdf.moveTo(posX, posY).lineTo(posX+args.larguraBoleto, posY).stroke(args.corLinhas);
					pdf.moveTo(posX, posY).lineTo(posX, posY+args.alturaCampos).stroke(args.corLinhas);

					textosCampoBasico(
						titulos.pagador, 
						nomePagador, 
						posX, posY, widthCampo, args.alturaCampos, 'left'
					);

					posX = args.marginLeft+args.larguraBoleto-args.larguraCamposDireita;
					widthCampo = args.larguraCamposDireita;

					textosCampoBasico(
						titulos.cpfCnpj+':',
						regNacPagadorFormatado, 
						posX, posY, widthCampo, args.fontSizeTextos, 'left'
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
							height: args.fontSizeTextos,
							align: 'left'
						});

					posX = args.marginLeft + args.larguraBoleto-args.larguraCamposDireita;
					widthCampo = args.larguraCamposDireita/2.666;

					pdf.font('negrito')
						.fontSize(args.fontSizeTitulos*1.1)
						.text(titulos.uf+': ', posX + args.paddingCampos, posY + args.paddingCampos + (args.fontSizeTextos/2.5), {
							lineBreak: false,
							width: widthCampo - args.paddingCampos*2,
							height: args.fontSizeTitulos*1.1,
							align: 'left',
							baseline: 'middle',
							continued: true
						})
						.font('normal')
						.fontSize(args.fontSizeTextos)
						.text(ufPagador);

					posX += widthCampo;
					widthCampo = args.marginLeft+args.larguraBoleto-posX;

					pdf.font('negrito')
						.fontSize(args.fontSizeTitulos*1.1)
						.text(titulos.cep+': ', posX + args.paddingCampos, posY + args.paddingCampos + (args.fontSizeTextos/2.5), {
							lineBreak: false,
							width: widthCampo - args.paddingCampos*2,
							height: args.fontSizeTitulos*1.1,
							align: 'left',
							baseline: 'middle',
							continued: true
						})
						.font('normal')
						.fontSize(args.fontSizeTextos)
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
						posX, posY, widthCampo, args.alturaCampos, 'center'
					);

					posX += widthCampo;
					pdf.moveTo(posX, posY).lineTo(posX, posY+args.alturaCampos).stroke(args.corLinhas);

					widthCampo = 76;
					textosCampoBasico(
						titulos.especieDoc, 
						especieDoc, 
						posX, posY, widthCampo, args.alturaCampos, 'center'
					);

					posX += widthCampo;
					pdf.moveTo(posX, posY).lineTo(posX, posY+args.alturaCampos).stroke(args.corLinhas);

					widthCampo = 120;
					pdf.rect(posX,posY,widthCampo,args.alturaCampos)
						.opacity(args.opacityCamposDestac)
						.fill(args.corLinhas)
						.opacity(1)
						.restore();

					textosCampoBasico(
						titulos.vencimento, 
						dataVencFormatado, 
						posX, posY, widthCampo, args.alturaCampos, 'center', args.paddingCampos, true
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
						posX, posY, widthCampo, args.alturaCampos, 'center', args.paddingCampos, true
					);

					posX = args.marginLeft+args.larguraBoleto-args.larguraCamposDireita;
					pdf.moveTo(posX, posY).lineTo(posX, posY+args.alturaCampos).stroke(args.corLinhas);

					widthCampo = args.larguraCamposDireita;
					
					textosCampoBasico(
						titulos.valorCobrado, 
						valorCobrado, 
						posX, posY, widthCampo, args.alturaCampos, 'center'
					);

					posX = args.marginLeft+args.larguraBoleto;
					pdf.moveTo(posX, posY).lineTo(posX, posY+args.alturaCampos).stroke(args.corLinhas);


					// LINHA 8
						
					posX = args.marginLeft;
					posY += args.alturaCampos;

					let alturaRodape = (args.fontSizeRodape*txtLivreRodapeRecPag.length)+args.paddingCampos;
					alturaRodape = alturaRodape > args.alturaCampos ? alturaRodape : args.alturaCampos;
					
					pdf.moveTo(posX, posY).lineTo(posX+args.larguraBoleto, posY).stroke(args.corLinhas);
					//pdf.moveTo(posX, posY).lineTo(posX, posY+alturaRodape).stroke(args.corLinhas);

					widthCampo = args.larguraCodigoBarras;

					txtLivreRodapeRecPag.forEach((txtLinha, index) =>{
						pdf.font('normal')
							.fontSize(args.fontSizeRodape)
							.text(txtLinha, posX + args.paddingCampos, posY + args.paddingCampos +(args.fontSizeRodape*index), {
								lineBreak: false,
								width: widthCampo - args.paddingCampos*2,
								height: args.fontSizeRodape,
								align: 'center'
							});
					});
					
					posX += widthCampo;
					widthCampo = args.marginLeft+args.larguraBoleto-posX;

					pdf.moveTo(posX, posY).lineTo(posX, posY+alturaRodape).stroke(args.corLinhasSuaves);
					
					pdf.font('normal')
						.fontSize(args.fontSizeTitulos)
						.text(titulos.autentMecanica+' - ', posX+widthCampo*.125, posY + args.paddingCampos*1.125, {
							lineBreak: false,
							width: widthCampo*.777,
							height: args.fontSizeTitulos,
							continued: true,
							align: 'left'
						})
						.font('negrito')
						.text(titulos.reciboPagador);

					/* posX = args.marginLeft+args.larguraBoleto;
					pdf.moveTo(posX, posY).lineTo(posX, posY+alturaRodape).stroke(args.corLinhas); */
					
					posY += alturaRodape;

					// FIM MODELO COMPLETO					

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
						.text(titulos.beneficiario.toUpperCase()+':', args.ajusteX + 27, args.ajusteY + zeroLinha, {
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
						.text(titulos.reciboPagador.toUpperCase(), args.ajusteX + 278, args.ajusteY + zeroLinha, {
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
						.text(identificacaoPagador, args.ajusteX + 32, args.ajusteY + primeiraLinha, {
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
						.text(titulos.valorCobrado, args.ajusteX + 424, args.ajusteY + tituloDaPrimeiraLinha, {
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
							.text(carteiraTexto, args.ajusteX + 32, args.ajusteY + primeiraLinhaOpcional, {
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
							.text(especieDoc, args.ajusteX + 105, args.ajusteY + primeiraLinhaOpcional, {
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
							.text(valorDocFormatado, args.ajusteX + 424, args.ajusteY + primeiraLinhaOpcional, {
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
						.text(titulos.autentMecanica, args.ajusteX + 426, args.ajusteY + segundaLinha - 5, {
							lineBreak: false,
							width: 294,
							align: 'left'
						});

					// FIM MODELOS SIMPLES E REDUZIDO

				}

				pdf.save();

				// VERIFICAR QUEBRA DE PAGINA
				if(posY > args.limiteFichaCompensacao-args.marginBottom){
					pdf.restore().save().addPage();
					posY = args.marginTop;
				}else{

					//////////////////////////////////////////////////////////////////////////
					//////////////////////////	TESOURA DIVISORIA	//////////////////////////

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

					posY += args.alturaCampos*.666;

				}

				//////////////////////////////////////////////////////////////////////////////
				//////////////////////////	FICHA DE COMPENSACAO	//////////////////////////

				// LINHA 1

				posX = args.marginLeft;
				widthCampo = args.larguraLogoBanco;

				pdf.image(logoBanco, posX, posY, {
					height: args.alturaCampos-args.paddingCampos
				});

				banco.getImprimirNome() && pdf.font('negrito')
					.fontSize(args.fontSizeLinhaDigitavel)
					.text(nomeBanco, posX, posY, {
						lineBreak: false,
						width: widthCampo,
						height: args.fontSizeLinhaDigitavel,
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
						height: args.fontSizeLinhaDigitavel,
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
						height: args.fontSizeLinhaDigitavel,
						align: 'right'
					});
				
				// LINHA 2

				posX = args.marginLeft;
				posY += args.alturaCampos;
				
				pdf.moveTo(posX, posY).lineTo(posX+args.larguraBoleto, posY).stroke(args.corLinhas);
				pdf.moveTo(posX, posY).lineTo(posX, posY+args.alturaCamposExtra).stroke(args.corLinhas);

				widthCampo = args.larguraBoleto-args.larguraCamposDireita;
				textosCampoBasico(
					titulos.localPagamento, 
					'', 
					posX, posY, widthCampo, null, 'left'
				);

				locaisPagamento.forEach(function(local, indice) {
					if (indice > 1) { return; }

					pdf.font('normal')
						.fontSize(args.fontSizeTextos)
						.text(local, posX+args.paddingCampos, locaisPagamento.length == 1 ? posY+args.alturaCamposExtra*.444 : posY+args.fontSizeTitulos+args.paddingCampos+args.fontSizeTextos*indice, {
							lineBreak: false,
							width: widthCampo,
							height: args.fontSizeTextos,
							align: 'left'
						});
				});

				posX += widthCampo;
				widthCampo = args.larguraCamposDireita;

				pdf.rect(posX,posY,widthCampo,args.alturaCamposExtra)
					.opacity(args.opacityCamposDestac)
					.fill(args.corLinhas)
					.opacity(1)
					.restore();

				pdf.moveTo(posX, posY).lineTo(posX, posY+args.alturaCamposExtra).stroke(args.corLinhas);

				textosCampoBasico(
					titulos.vencimento, 
					dataVencFormatado, 
					posX, posY, widthCampo, args.alturaCamposExtra, 'right', args.paddingCampos*2, true
				);

				posX = args.marginLeft+args.larguraBoleto;
				pdf.moveTo(posX, posY).lineTo(posX, posY+args.alturaCamposExtra).stroke(args.corLinhas);

				
				// LINHA 3

				posX = args.marginLeft;
				posY += args.alturaCamposExtra;

				pdf.moveTo(posX, posY).lineTo(posX+args.larguraBoleto, posY).stroke(args.corLinhas);
				pdf.moveTo(posX, posY).lineTo(posX, posY+args.alturaCampos).stroke(args.corLinhas);

				widthCampo = args.larguraBoleto-args.larguraCamposDireita;
				textosCampoBasico(
					titulos.beneficiario, 
					identificacaoBeneficiario, 
					posX, posY, widthCampo, args.alturaCampos, 'left'
				);

				posX += widthCampo;
				pdf.moveTo(posX, posY).lineTo(posX, posY+args.alturaCampos).stroke(args.corLinhas);

				widthCampo = args.larguraCamposDireita;

				textosCampoBasico(
					titulos.agCodBeneficiario, 
					agenciaCodBeneficiario, 
					posX, posY, widthCampo, args.alturaCampos, 'right', args.paddingCampos*2
				);

				posX = args.marginLeft+args.larguraBoleto;
				pdf.moveTo(posX, posY).lineTo(posX, posY+args.alturaCampos).stroke(args.corLinhas);


				// LINHA 4

				posX = args.marginLeft;
				posY += args.alturaCampos;

				pdf.moveTo(posX, posY).lineTo(posX+args.larguraBoleto, posY).stroke(args.corLinhas);
				pdf.moveTo(posX, posY).lineTo(posX, posY+args.alturaCampos).stroke(args.corLinhas);

				widthCampo = 78;
				textosCampoBasico(
					titulos.dataDocumento, 
					dataDocFormatado, 
					posX, posY, widthCampo, args.alturaCampos, 'left'
				);

				posX += widthCampo;
				pdf.moveTo(posX, posY).lineTo(posX, posY+args.alturaCampos).stroke(args.corLinhas);

				widthCampo = 96;
				textosCampoBasico(
					titulos.numDocumento, 
					numDocFormatado, 
					posX, posY, widthCampo, args.alturaCampos, 'center'
				);

				posX += widthCampo;
				pdf.moveTo(posX, posY).lineTo(posX, posY+args.alturaCampos).stroke(args.corLinhas);

				widthCampo = 66;
				textosCampoBasico(
					titulos.especieDoc, 
					especieDoc, 
					posX, posY, widthCampo, args.alturaCampos, 'center'
				);

				posX += widthCampo;
				pdf.moveTo(posX, posY).lineTo(posX, posY+args.alturaCampos).stroke(args.corLinhas);

				widthCampo = 66;
				textosCampoBasico(
					titulos.aceite, 
					aceiteFormatado, 
					posX, posY, widthCampo, args.alturaCampos, 'center'
				);

				posX += widthCampo;
				pdf.moveTo(posX, posY).lineTo(posX, posY+args.alturaCampos).stroke(args.corLinhas);

				widthCampo = args.marginLeft+args.larguraBoleto-args.larguraCamposDireita-posX;
				textosCampoBasico(
					titulos.dataProcessamento, 
					dataProcFormatado, 
					posX, posY, widthCampo, args.alturaCampos, 'center'
				);

				posX = args.marginLeft+args.larguraBoleto-args.larguraCamposDireita;
				pdf.moveTo(posX, posY).lineTo(posX, posY+args.alturaCampos).stroke(args.corLinhas);

				widthCampo = args.larguraCamposDireita;

				textosCampoBasico(
					titulos.nossoNumero, 
					nossoNumFormatado, 
					posX, posY, widthCampo, args.alturaCampos, 'right', args.paddingCampos*2
				);

				posX = args.marginLeft+args.larguraBoleto;
				pdf.moveTo(posX, posY).lineTo(posX, posY+args.alturaCampos).stroke(args.corLinhas);


				// LINHA 5

				posX = args.marginLeft;
				posY += args.alturaCampos;

				pdf.moveTo(posX, posY).lineTo(posX+args.larguraBoleto, posY).stroke(args.corLinhas);
				pdf.moveTo(posX, posY).lineTo(posX, posY+args.alturaCampos).stroke(args.corLinhas);

				widthCampo = 96;
				textosCampoBasico(
					titulos.usoBanco, 
					'', 
					posX, posY, widthCampo, null, 'left'
				);

				posX += widthCampo;
				pdf.moveTo(posX, posY).lineTo(posX, posY+args.alturaCampos).stroke(args.corLinhas);

				widthCampo = 66;
				textosCampoBasico(
					titulos.carteira, 
					carteiraTexto, 
					posX, posY, widthCampo, args.alturaCampos, 'center'
				);

				posX += widthCampo;
				pdf.moveTo(posX, posY).lineTo(posX, posY+args.alturaCampos).stroke(args.corLinhas);

				widthCampo = 66;
				textosCampoBasico(
					titulos.especieMoeda, 
					especieMoeda, 
					posX, posY, widthCampo, args.alturaCampos, 'center'
				);

				posX += widthCampo;
				pdf.moveTo(posX, posY).lineTo(posX, posY+args.alturaCampos).stroke(args.corLinhas);

				widthCampo = 106;
				textosCampoBasico(
					titulos.quantidade, 
					quantidadeMoeda, 
					posX, posY, widthCampo, args.alturaCampos, 'center'
				);

				posX += widthCampo;
				pdf.moveTo(posX, posY).lineTo(posX, posY+args.alturaCampos).stroke(args.corLinhas);

				widthCampo = args.marginLeft+args.larguraBoleto-args.larguraCamposDireita-posX;
				textosCampoBasico(
					titulos.valor, 
					'', 
					posX, posY, widthCampo, null, 'center'
				);

				posX = args.marginLeft+args.larguraBoleto-args.larguraCamposDireita;
				widthCampo = args.larguraCamposDireita;

				pdf.rect(posX,posY,widthCampo,args.alturaCampos)
					.opacity(args.opacityCamposDestac)
					.fill(args.corLinhas)
					.opacity(1)
					.restore();

				pdf.moveTo(posX, posY).lineTo(posX, posY+args.alturaCampos).stroke(args.corLinhas);

				textosCampoBasico(
					titulos.igual+' '+titulos.valorDocumento, 
					valorDocFormatado, 
					posX, posY, widthCampo, args.alturaCampos, 'right', args.paddingCampos*2, true
				);

				posX = args.marginLeft+args.larguraBoleto;
				pdf.moveTo(posX, posY).lineTo(posX, posY+args.alturaCampos).stroke(args.corLinhas);


				// LINHA 6

				posX = args.marginLeft;
				posY += args.alturaCampos;

				pdf.moveTo(posX, posY).lineTo(posX+args.larguraBoleto, posY).stroke(args.corLinhas);
				pdf.moveTo(posX, posY).lineTo(posX, posY+args.alturaCampos*5).stroke(args.corLinhas);

				widthCampo = args.larguraBoleto-args.larguraCamposDireita;
				textosCampoBasico(
					titulos.instrucoes, 
					'', 
					posX, posY, widthCampo, null, 'left'
				);

				instrucoes.forEach(function(instrucao, indice) {
					pdf.font('normal')
						.fontSize(args.fontSizeTextos*.966)
						.text(String(instrucao).trim(), posX+args.paddingCampos, posY+args.fontSizeTitulos+(args.paddingCampos*2)+((args.fontSizeTextos+args.paddingCampos)*indice), {
							lineBreak: true,
							width: widthCampo-(args.paddingCampos*2),
							align: 'left'
						});
				});

				posX += widthCampo;
				pdf.moveTo(posX, posY).lineTo(posX, posY+args.alturaCampos*5).stroke(args.corLinhas);

				widthCampo = args.larguraCamposDireita;

				textosCampoBasico(
					titulos.menos+' '+titulos.desconto, 
					valorDescFormatado, 
					posX, posY, widthCampo, args.alturaCampos, 'right', args.paddingCampos*2
				);

				posX = args.marginLeft+args.larguraBoleto;
				pdf.moveTo(posX, posY).lineTo(posX, posY+args.alturaCampos).stroke(args.corLinhas);

				// LINHA 7

				posX = args.marginLeft+args.larguraBoleto-args.larguraCamposDireita;
				posY += args.alturaCampos;

				pdf.moveTo(posX, posY).lineTo(posX+args.larguraCamposDireita, posY).stroke(args.corLinhas);
				
				widthCampo = args.larguraCamposDireita;
				textosCampoBasico(
					titulos.menos+' '+titulos.deducoes, 
					valorDeducoesFormatado, 
					posX, posY, widthCampo, args.alturaCampos, 'right', args.paddingCampos*2
				);

				posX = args.marginLeft+args.larguraBoleto;
				pdf.moveTo(posX, posY).lineTo(posX, posY+args.alturaCampos).stroke(args.corLinhas);

				// LINHA 8

				posX = args.marginLeft+args.larguraBoleto-args.larguraCamposDireita;
				posY += args.alturaCampos;

				pdf.moveTo(posX, posY).lineTo(posX+args.larguraCamposDireita, posY).stroke(args.corLinhas);
				
				widthCampo = args.larguraCamposDireita;
				textosCampoBasico(
					titulos.mais+' '+titulos.moraMulta, 
					valorMoraMultaFormatado, 
					posX, posY, widthCampo, args.alturaCampos, 'right', args.paddingCampos*2
				);

				posX = args.marginLeft+args.larguraBoleto;
				pdf.moveTo(posX, posY).lineTo(posX, posY+args.alturaCampos).stroke(args.corLinhas);

				// LINHA 9

				posX = args.marginLeft+args.larguraBoleto-args.larguraCamposDireita;
				posY += args.alturaCampos;

				pdf.moveTo(posX, posY).lineTo(posX+args.larguraCamposDireita, posY).stroke(args.corLinhas);
				
				widthCampo = args.larguraCamposDireita;
				textosCampoBasico(
					titulos.mais+' '+titulos.acrescimos, 
					valorAcrescimosFormatado, 
					posX, posY, widthCampo, args.alturaCampos, 'right', args.paddingCampos*2
				);

				posX = args.marginLeft+args.larguraBoleto;
				pdf.moveTo(posX, posY).lineTo(posX, posY+args.alturaCampos).stroke(args.corLinhas);

				// LINHA 10

				posX = args.marginLeft+args.larguraBoleto-args.larguraCamposDireita;
				posY += args.alturaCampos;

				pdf.moveTo(posX, posY).lineTo(posX+args.larguraCamposDireita, posY).stroke(args.corLinhas);
				
				widthCampo = args.larguraCamposDireita;
				textosCampoBasico(
					titulos.igual+' '+titulos.valorCobrado, 
					valorCobrado, 
					posX, posY, widthCampo, args.alturaCampos, 'right', args.paddingCampos*2
				);

				posX = args.marginLeft+args.larguraBoleto;
				pdf.moveTo(posX, posY).lineTo(posX, posY+args.alturaCampos).stroke(args.corLinhas);


				// LINHA 11

				posX = args.marginLeft;
				posY += args.alturaCampos;
				widthCampo = args.larguraBoleto-args.larguraCamposDireita;
				pdf.moveTo(posX, posY).lineTo(posX+args.larguraBoleto, posY).stroke(args.corLinhas);
				pdf.moveTo(posX, posY).lineTo(posX, posY+args.alturaCampos).stroke(args.corLinhas);

				textosCampoBasico(
					titulos.pagador, 
					nomePagador, 
					posX, posY, widthCampo, args.alturaCampos, 'left'
				);

				posX = args.marginLeft+args.larguraBoleto-args.larguraCamposDireita;
				widthCampo = args.larguraCamposDireita;

				textosCampoBasico(
					titulos.cpfCnpj+':', 
					regNacPagadorFormatado, 
					posX, posY, widthCampo, args.alturaCampos, 'left'
				);

				posX = args.marginLeft + args.larguraBoleto;
				pdf.moveTo(posX, posY).lineTo(posX, posY+args.alturaCampos).stroke(args.corLinhas);
				
				posY += args.alturaCampos;
				posX = args.marginLeft;
				widthCampo = args.larguraBoleto-args.larguraCamposDireita;

				// LINHA 11-B

				pdf.moveTo(posX, posY).lineTo(posX, posY+args.fontSizeTextos+args.paddingCampos).stroke(args.corLinhas);

				pdf.font('normal')
					.fontSize(args.fontSizeTextos*.966)
					.text(enderecoCurtoPagador, posX + args.paddingCampos, posY + args.paddingCampos, {
						lineBreak: false,
						width: widthCampo - args.paddingCampos*2,
						height: args.fontSizeTextos,
						align: 'left'
					});

				posX = args.marginLeft + args.larguraBoleto-args.larguraCamposDireita;
				widthCampo = args.larguraCamposDireita/2.666;

				pdf.font('negrito')
					.fontSize(args.fontSizeTitulos*1.1)
					.text(titulos.uf+': ', posX + args.paddingCampos, posY + args.paddingCampos + (args.fontSizeTextos/2.5), {
						lineBreak: false,
						width: widthCampo - args.paddingCampos*2,
						height: args.fontSizeTitulos*1.1,
						align: 'left',
						baseline: 'middle',
						continued: true
					})
					.font('normal')
					.fontSize(args.fontSizeTextos)
					.text(ufPagador);

				posX += widthCampo;
				widthCampo = args.marginLeft+args.larguraBoleto-posX;

				pdf.font('negrito')
					.fontSize(args.fontSizeTitulos*1.1)
					.text(titulos.cep+': ', posX + args.paddingCampos, posY + args.paddingCampos + (args.fontSizeTextos/2.5), {
						lineBreak: false,
						width: widthCampo - args.paddingCampos*2,
						height: args.fontSizeTitulos*1.1,
						align: 'left',
						baseline: 'middle',
						continued: true
					})
					.font('normal')
					.fontSize(args.fontSizeTextos)
					.text(cepPagador);

				posX = args.marginLeft+args.larguraBoleto;
				pdf.moveTo(posX, posY).lineTo(posX, posY+args.fontSizeTextos+args.paddingCampos).stroke(args.corLinhas);
				
				// LINHA 11-C

				posX = args.marginLeft;
				posY += (args.fontSizeTextos+args.paddingCampos);
				widthCampo = args.larguraBoleto-args.larguraCamposDireita;
				pdf.moveTo(posX, posY).lineTo(posX, posY+args.fontSizeTextos+args.paddingCampos).stroke(args.corLinhas);

				pdf.font('negrito')
					.fontSize(args.fontSizeTitulos)
					.text(titulos.sacadorAvalista+': ', posX + args.paddingCampos, posY + args.paddingCampos + (args.fontSizeTextos/2.5), {
						lineBreak: false,
						width: widthCampo - args.paddingCampos*2,
						height: args.fontSizeTitulos,
						align: 'left',
						baseline: 'middle',
						continued: true
					})
					.font('normal')
					.fontSize(args.fontSizeTextos)
					.text(nomeSacadorAvalista);

				posX = args.marginLeft+args.larguraBoleto-args.larguraCamposDireita;
				widthCampo = args.larguraCamposDireita;

				pdf.font('negrito')
					.fontSize(args.fontSizeTitulos)
					.text(titulos.cpfCnpj+': ', posX + args.paddingCampos, posY + args.paddingCampos + (args.fontSizeTextos/2.5), {
						lineBreak: false,
						width: widthCampo - args.paddingCampos*2,
						height: args.fontSizeTitulos,
						align: 'left',
						baseline: 'middle',
						continued: true
					})
					.font('normal')
					.fontSize(args.fontSizeTextos)
					.text(regNacSacAvalistaFormatado);

				posX = args.marginLeft + args.larguraBoleto;
				pdf.moveTo(posX, posY).lineTo(posX, posY+args.fontSizeTextos+args.paddingCampos).stroke(args.corLinhas);
				
				posX = args.marginLeft;
				posY += (args.fontSizeTextos+args.paddingCampos);
				pdf.moveTo(posX, posY).lineTo(posX+args.larguraBoleto, posY).stroke(args.corLinhas);
				
				// CODIGO DE BARRAS
				pdf.save();

				widthCampo = args.larguraCodigoBarras;
				let alturaCodBarras = args.fontSizeCodBarras*1.666;
				
				pdf.font('codigoDeBarras')
					.fontSize(args.fontSizeCodBarras)
					.translate(posX-8, posY+args.paddingCampos/2)
					.scale(1,alturaCodBarras/args.fontSizeCodBarras)
					.text(i25(codigoDeBarras), 0, 0, {
						lineBreak: false,
						width: widthCampo+10,
						height: args.fontSizeCodBarras,
						align: 'left'
					})
					.translate(0,0)
					.scale(1)
					.restore();

				posX = args.marginLeft+widthCampo;
				widthCampo = args.marginLeft+args.larguraBoleto-posX;

				//pdf.moveTo(posX, posY).lineTo(posX, posY+alturaCodBarras).stroke(args.corLinhas);
				
				pdf.font('normal')
					.fontSize(args.fontSizeTitulos)
					.text(titulos.autentMecanica+' - ', posX+widthCampo*.095, posY + args.paddingCampos*2, {
						lineBreak: false,
						width: widthCampo*.95,
						height: args.fontSizeTitulos,
						continued: true,
						align: 'left'
					})
					.font('negrito')
					.text(titulos.fichaCompensacao);

				/* posX = args.marginLeft+args.larguraBoleto;
				pdf.moveTo(posX, posY).lineTo(posX, posY+alturaCodBarras).stroke(args.corLinhas); */
				
				posY += args.fontSizeCodBarras;
				
				//////////////////////////	FIM DO BOLETO	//////////////////////////
				//////////////////////////////////////////////////////////////////////
				
				// CREDITOS
				
				posX = args.marginLeft;
				posY += args.alturaCampos;

				args.creditos && pdf.font('italico')
					.fontSize(8)
					.text(args.creditos, posX, posY, {
						width: 560,
						align: 'center'
					});

				
				/* if (banco.exibirCampoCip()) {
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
				} */


				/* if (args.exibirCampoUnidadeBeneficiaria) {
					pdf.font('negrito')
						.fontSize(args.fontSizeTitulos)
						.text('Unidade Beneficiária', args.ajusteX + 30, args.ajusteY + tituloDaSetimaLinha + 70, {
							lineBreak: false,
							width: 294,
							align: 'left'
						});
				} */


				/* if (enderecoPagador) {
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
				} */

				/* pdf.font('negrito')
					.fontSize(args.fontSizeTitulos)
					.text('Código de Baixa', args.ajusteX + 370, args.ajusteY + tituloDaSetimaLinha + 159, {
						lineBreak: false,
						width: 294,
						align: 'left'
					}); */


				// args.imprimirSequenciaDoBoleto && pdf.font('italico')
				//  .fontSize(args.fontSizeTextos)
				//  .text('Boleto Nº ' + (indice + 1) + '/' + boletos.length, args.ajusteX + 30, args.ajusteY + 10, {
				//      width: 560,
				//      align: 'center'
				//  });

				posX = args.marginLeft;
				posY += args.alturaCamposExtra;

				informacoesPersonalizadas(pdf, posX + posY);

				if (indice < boletos.length - 1) {
					pdf.restore().save().addPage();
					posY = args.marginTop;
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
