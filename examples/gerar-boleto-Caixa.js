const Gerador = require('../index');
const { gerarPdf, gerarBoleto} = require('./index');
const streamToPromise = require('../lib/utils/util');

const boleto = {
	banco: new Gerador.boleto.bancos.Caixa(),
	beneficiario: {
		dadosBancarios:{
			nossoNumero: '000082107220355', // valor unico de 15 digitos
			//nossoNumeroDigito: '0' // calculado por mod11 para Caixa
		}
	},
	pagador: { 
		RegistroNacional: '000014205447809', // TODO: mostrar no boleto
    	cpf: '123456789-01', // TODO: mostrar no boleto
		nome: 'Nome do Pagador',
		endereco:{
			logradouro: 'Rua do Pagador',
			bairro:'Bairro do Pagador',
			cidade:'São Paulo',
			uf:'SP',
			cep:'76543-210'
		}
	},
	boleto: {
		numeroDocumento: '10010010110',
		especieDocumento: 'DM',
		valores:{
			documento: 882.35,
			descAbatimentos: 0
		},
		datas: { // MM-DD-AAAA
			vencimento: '05-23-2020',
			processamento: '05-22-2020',
			documentos: '05-22-2020'
		},
		instrucoes:[
			'Instruções individuais'
		]
	}
};
	
const novoBoleto = gerarBoleto(boleto);
gerarPdf(novoBoleto).then(async({stream})=>{
	// ctx.res.set('Content-type', 'application/pdf');	
	await streamToPromise(stream);
}).catch((error)=>{
	return error;
});
