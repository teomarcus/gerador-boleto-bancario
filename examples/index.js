const Gerador = require('../index');
const GeradorDeDigitoPadrao = require('../lib/boleto/gerador-de-digito-padrao');
const fs = require('fs');

const gerarPdf = (boleto, stream = null)=>{
	
	if(!stream){
		const dir = './tmp/boletos';
		if (!fs.existsSync(dir)) fs.mkdirSync(dir);
		stream = fs.createWriteStream(`${dir}/boleto.pdf`);
	}

	return new Promise(async (resolve)=> {
		return await new Gerador.boleto.Gerador(boleto).gerarPDF({
			creditos: '',
			stream: stream
		}).then(()=>{
			return resolve({boleto, stream});
		});
	});
	
};

const gerarBoleto = (boleto_info)=>{
	const { banco, pagador, boleto, beneficiario } = boleto_info;
	const { datas, valores, especieDocumento, numeroDocumento, instrucoes } = boleto;
	const { documento: valorDoc, descAbatimentos } = valores;
	const da = Gerador.boleto.Datas;

	return Gerador.boleto.Boleto.novoBoleto()
		.comDatas(da.novasDatas()
			.comVencimento(datas.vencimento)
			.comProcessamento(datas.processamento)
			.comDocumento(datas.documentos))
		.comBeneficiario(createBeneficiario(beneficiario))
		.comPagador(createPagador(pagador))
		.comBanco(banco)
		.comLocaisDePagamento('Conforme instruções abaixo')
		.comValorBoleto(parseFloat(valorDoc).toFixed(2))
		.comValorDescontos(parseFloat(descAbatimentos).toFixed(2))
		.comNumeroDoDocumento(numeroDocumento)
		.comEspecieDocumento(especieDocumento)
		.comInstrucoes(createInstrucoes(instrucoes));
};
  
const createPagador = (pagador)=>{
	const {endereco} = pagador;

	const enderecoPagador = Gerador.boleto.Endereco.novoEndereco()
		.comLogradouro(endereco.logradouro)
		.comBairro(endereco.bairro)
		.comCidade(endereco.cidade)
		.comUf(endereco.uf)
		.comCep(endereco.cep);

	return Gerador.boleto.Pagador.novoPagador()
		.comNome(pagador.nome)
		.comRegistroNacional(pagador.RegistroNacional)
		.comEndereco(enderecoPagador);
};
  
const createBeneficiario = (beneficiario)=>{
	const enderecoBeneficiario = Gerador.boleto.Endereco.novoEndereco()
		.comLogradouro('Rua do Beneficiário')
		.comBairro('Bairro do Beneficiário')
		.comCidade('São Paulo')
		.comUf('SP')
		.comCep('01234-567');

	let {dadosBancarios} = beneficiario;
	dadosBancarios = {
		...dadosBancarios,
		carteira:'14',
		agencia: '00281',
		digitoAgencia: '0',
		codigoBeneficiario: '721692',
		nome: 'TESTE GIM - MERITUS',
		//registroNacional: '43576788000191', // CNPJ
		cnpj: '43576788000191' // CNPJ
	};
	
	let novoBeneficiario =  Gerador.boleto.Beneficiario.novoBeneficiario()
		.comCarteira(dadosBancarios.carteira)
		.comNossoNumero(dadosBancarios.nossoNumero) //11 -digitos // "00000005752"
		.comDigitoNossoNumero(GeradorDeDigitoPadrao.mod11(dadosBancarios.carteira+dadosBancarios.nossoNumero, {de: [0, 10, 11], para: 0}))
		.comAgencia(dadosBancarios.agencia)
		.comDigitoAgencia(dadosBancarios.digitoAgencia)
		.comCodigoBeneficiario(dadosBancarios.codigoBeneficiario) // TODO: 7 digits
		.comDigitoCodigoBeneficiario(GeradorDeDigitoPadrao.mod11(dadosBancarios.codigoBeneficiario, {de: [0, 10, 11], para: 0}))
		.comNome(dadosBancarios.nome)
		//.comRegistroNacional(dadosBancarios.registroNacional)
		.comCNPJ(dadosBancarios.cnpj)
		.comEndereco(enderecoBeneficiario);

	if(dadosBancarios.nossoNumeroDigito){
		novoBeneficiario.comDigitoNossoNumero(dadosBancarios.nossoNumeroDigito); // 1 digito // 8
	}
	if(dadosBancarios.convenio){
		novoBeneficiario.comNumeroConvenio(dadosBancarios.convenio);
	}

	return novoBeneficiario;
};

const createInstrucoes = (instrucoes)=>{
	const instrucoesCompletas = [...instrucoes];
	instrucoesCompletas.unshift('Pagável preferencialmente na CAIXA ECONOMICA FEDERAL');
	
	return instrucoesCompletas;
};

module.exports = { gerarPdf, gerarBoleto };
