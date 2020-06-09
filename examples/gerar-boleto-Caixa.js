const Gerador = require('../index');
const { gerarPdf, gerarBoleto} = require('./index');
const GeradorDeDigitoPadrao = require('../lib/boleto/gerador-de-digito-padrao');
//const streamToPromise = require('../lib/utils/util');
//const async  = require('express-async-errors'); // if using Express Server

const gerar_Boleto_PDF = async dadosBoleto => {

	const { pagador, boleto } = dadosBoleto;
	const { nome : nomePagador, cpf : cpfPagador, endereco : enderecoPagador } = pagador;
	const { logradouro: logradouroPagador, bairro: bairroPagador, cidade: cidadePagador, uf: ufPagador, cep:cepPagador } = enderecoPagador;
	const { nossoNumero, numDoc, valores, datas, instrucoes=[], infosRecibo } = boleto;
	const { documento: valorDoc, descontos: valorDesc, deducoes: valorDeducoes, moraMulta: valorMulta, outrosAcrescimos: valorAcres, cobrado: valorCobrado } = valores;
	const { vencimento: dataVenc, processamento: dataProc, documentos: dataDoc } = datas;
	
	const codBeneficiario = '721692';

	const dadosCompletosBoleto = {
		banco: new Gerador.boleto.bancos.Caixa(),
		beneficiario: {
			dadosBancarios:{
				carteira:'14',
				agencia: '00281',
				digitoAgencia: '0',
				codigoBeneficiario: codBeneficiario,
				nome: 'Nome do Beneficiário',
				//registroNacional: '12345678000191',
				cnpj: '67781392000144', // somente digitos
				nossoNumero: nossoNumero,
				digitoNossoNumero: GeradorDeDigitoPadrao.mod11(nossoNumero, {de: [0, 10, 11], para: 0})+'', // string
				digitoCodBeneficiario: GeradorDeDigitoPadrao.mod11(codBeneficiario, {de: [0, 10, 11], para: 0})+'' // string
			},
			endereco:{
				logradouro: 'Rua do Beneficiário',
				bairro:'Bairro do Beneficiário',
				cidade:'São Paulo',
				uf:'SP',
				cep:'01234-567'
			}
		},
		pagador: { 
			//RegistroNacional: '123456789', 
			cpf: cpfPagador, 
			nome: nomePagador,
			endereco:{
				logradouro: logradouroPagador,
				bairro: bairroPagador,
				cidade: cidadePagador,
				uf: ufPagador,
				cep:cepPagador
			}
		},
		boleto: {
			locaisPagamento: 'Conforme instruções abaixo',
			numeroDocumento: numDoc,
			especieDocumento: 'DM',
			valores:{
				documento: valorDoc,
				descontos: valorDesc, // Não necessário
				deducoes: valorDeducoes, // Não necessário
				moraMulta: valorMulta, // Não necessário
				outrosAcrescimos: valorAcres, // Não necessário
				cobrado: valorCobrado // Não implementado e não necessário
			},
			datas: { // MM-DD-YYYY
				vencimento: dataVenc,
				processamento: dataProc,
				documentos: dataDoc
			},
			instrucoes:[
				'Pagável preferencialmente na CAIXA ECONOMICA FEDERAL',
				...instrucoes
			],
			informacoesRecibo: infosRecibo
		}
	};
	
	const novoBoleto = gerarBoleto(dadosCompletosBoleto);

	return await gerarPdf(novoBoleto).then((ret)=>{
		return ret;
	}).catch((error)=>{
		return error;
	});

}

const dadosBoleto = {
	pagador: {
	  cpf: '97653667015', // somente digitos
	  nome: 'Nome do Pagador',
	  endereco: {
		logradouro: 'Rua do Pagador, 123',
		bairro: 'Bairro do Pagador',
		cidade: 'Cidade',
		uf: 'SP',
		cep: '09876540'
	  }
	},
	boleto: {
	  nossoNumero: '000082107220355',
	  numDoc: '10010010110',
	  valores: { // em string para forçar impressao
		documento: 2142.6, 
		descontos: 0, // nao deve ser preenchido
		deducoes: 0, // nao deve ser preenchido
		moraMulta: 0, // nao deve ser preenchido
		outrosAcrescimos: 0, // nao deve ser preenchido
		cobrado: 2142.6 // nao deve ser preenchido
	  },
	  datas: { // MM-DD-YYYY
		vencimento: '06-21-2020',
		processamento: '06-08-2020',
		documentos: '06-08-2020'
	  },
	  instrucoes: [
		'Texto de Instruções',
		' Após o vencimento, pagável apenas no Banco Emissor'
	  ],
	  infosRecibo: [
		'Texto de Descrição no Recibo do Pagador',
		'Dividido em 2 Colunas'
	  ]
	}
  };

  gerar = async () => {
	const retornoBoleto = await gerar_Boleto_PDF(dadosBoleto);
	console.log('ARQUIVO DO BOLETO: ', retornoBoleto.path);
  }
  
  gerar();

