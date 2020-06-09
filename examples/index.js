const Gerador = require('../index');
const fs = require('fs');

const gerarPdf = (boleto, fileName = null, stream = null)=>{
	if(!fileName){
		fileName = 'boleto';
	}
	if(!stream){
		const dir = './tmp/';
		if (!fs.existsSync(dir)) fs.mkdirSync(dir);
		stream = fs.createWriteStream(`${dir}${fileName}.pdf`);
	}

	return new Promise(async (resolve, reject)=> {
		return await new Gerador.boleto.Gerador(boleto).gerarPDF({
			creditos: '',
			stream: stream
		}).then(pdf=>{
			return resolve({pdf: pdf, path:stream.path});
		}).catch(error => {
			return reject(error);
		});
	});
	
};

const gerarBoleto = (boleto_info)=>{
	const { banco } = boleto_info;
	const { pagador, sacadorAvalista, boleto, beneficiario } = boleto_info;
	const { datas, valores, especieDocumento, numeroDocumento, instrucoes, informacoesRecibo, locaisPagamento } = boleto;
	const { documento: valorDoc, descontos, deducoes, moraMulta, outrosAcrescimos } = valores;
	const da = Gerador.boleto.Datas;

	
	let novoBoleto = Gerador.boleto.Boleto.novoBoleto()
		.comDatas(da.novasDatas()
			.comVencimento(datas.vencimento)
			.comProcessamento(datas.processamento)
			.comDocumento(datas.documentos))
		.comBeneficiario(createBeneficiario(beneficiario))
		.comPagador(createPagador(pagador))
		.comBanco(banco)
		.comLocaisDePagamento(locaisPagamento)
		.comValorBoleto(parseFloat(valorDoc).toFixed(2))
		.comNumeroDoDocumento(numeroDocumento)
		.comEspecieDocumento(especieDocumento)
		.comDescricoes(informacoesRecibo)
		.comInstrucoes(createInstrucoes(instrucoes));

	if(sacadorAvalista){
		novoBoleto.comsacadorAvalista(createSacadorAvalista(sacadorAvalista));
	}
	if(descontos){
		novoBoleto.comValorDescontos(parseFloat(descontos).toFixed(2));
	}
	if(deducoes){
		novoBoleto.comValorDeducoes(parseFloat(deducoes).toFixed(2));
	}
	if(moraMulta){
		novoBoleto.comValorMulta(parseFloat(moraMulta).toFixed(2));
	}
	if(outrosAcrescimos){
		novoBoleto.comValorAcrescimos(parseFloat(outrosAcrescimos).toFixed(2));
	}

	return novoBoleto;
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
		//.comRegistroNacional(pagador.RegistroNacional)
		.comCPF(pagador.cpf)
		.comEndereco(enderecoPagador);
};

const createSacadorAvalista = (sacadorAvalista)=>{
	return Gerador.boleto.SacadorAvalista.novoSacadorAvalista()
		.comNome(sacadorAvalista.nome)
		//.comRegistroNacional(sacadorAvalista.RegistroNacional)
		//.comCNPJ(sacadorAvalista.cnpj)
		.comCPF(sacadorAvalista.cpf);
};
  
const createBeneficiario = (beneficiario)=>{
	const {endereco} = beneficiario;

	const enderecoBeneficiario = Gerador.boleto.Endereco.novoEndereco()
		.comLogradouro(endereco.logradouro)
		.comBairro(endereco.bairro)
		.comCidade(endereco.cidade)
		.comUf(endereco.uf)
		.comCep(endereco.cep);

	let {dadosBancarios} = beneficiario;
	
	let novoBeneficiario =  Gerador.boleto.Beneficiario.novoBeneficiario()
		.comCarteira(dadosBancarios.carteira)
		.comNossoNumero(dadosBancarios.nossoNumero) //11 -digitos
		.comDigitoNossoNumero(dadosBancarios.digitoNossoNumero)
		.comAgencia(dadosBancarios.agencia)
		.comDigitoAgencia(dadosBancarios.digitoAgencia)
		.comCodigoBeneficiario(dadosBancarios.codigoBeneficiario) // TODO: 7 digits
		.comDigitoCodigoBeneficiario(dadosBancarios.digitoCodBeneficiario)
		.comNome(dadosBancarios.nome)
		//.comRegistroNacional(dadosBancarios.registroNacional)
		.comCNPJ(dadosBancarios.cnpj)
		.comEndereco(enderecoBeneficiario);

	if(dadosBancarios.nossoNumeroDigito){
		novoBeneficiario.comDigitoNossoNumero(dadosBancarios.nossoNumeroDigito); // 1 digito
	}
	if(dadosBancarios.convenio){
		novoBeneficiario.comNumeroConvenio(dadosBancarios.convenio);
	}

	return novoBeneficiario;
};

const createInstrucoes = (instrucoes)=>{
	return instrucoes;
};

module.exports = { gerarPdf, gerarBoleto };