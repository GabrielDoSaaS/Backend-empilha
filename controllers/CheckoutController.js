const Checkout = require('../models/Checkout');
const Checkin = require('../models/Checkin');
const User = require('../models/User');
const nodemailer = require('nodemailer');
const PDFDocument = require('pdfkit'); // Instale: npm install pdfkit axios
const axios = require('axios');
const path = require('path');
const fs = require('fs');

const CheckoutController = async (req, res) => {
    const { idCheckin, tecId, nameClient, images, videos, assinatura } = req.body;

    try {
        // 1. Coleta de dados
        const checkinData = await Checkin.findById(idCheckin);
        const userData = await User.findById(tecId);

        if (!checkinData) {
            return res.status(404).json({ message: 'Checkin não encontrado' });
        }

        const now = new Date();
        const dateCheckout = now.toLocaleDateString('pt-BR');
        const hourCheckout = now.toLocaleTimeString('pt-BR');
        const dateCheckin = new Date(checkinData.date).toLocaleDateString('pt-BR');
        const hourCheckin = checkinData.hourCheckin;

        // 2. Salvar o Checkout no Banco
        const newCheckout = new Checkout({ 
            checkinId: idCheckin, 
            tecId: tecId, 
            nameClient: nameClient, 
            images: images, 
            videos: videos, 
            assinatura: assinatura,
            date: now,
            hourCheckout: hourCheckout
        });
        await newCheckout.save();

        // 3. Geração do PDF com PDFKit
        const pdfName = `relatorio_${checkinData.numeracao || idCheckin}.pdf`;
        const outputPath = path.join(__dirname, '..', pdfName);
        const doc = new PDFDocument({ size: 'A4', margin: 40 });

        const stream = fs.createWriteStream(outputPath);
        doc.pipe(stream);

        // --- Cabeçalho ---
        doc.fontSize(20).text('ORDEM DE SERVIÇO', { continued: true });
        doc.fontSize(10).text(`Nº CONTROLE: ${checkinData.numeracao || 'N/A'}`, { align: 'right' });
        doc.moveDown().moveTo(40, doc.y).lineTo(555, doc.y).stroke();
        doc.moveDown();

        // --- Informações ---
        doc.fontSize(10).fillColor('#777').text('TÉCNICO RESPONSÁVEL');
        doc.fontSize(12).fillColor('#333').text(userData ? userData.name : 'N/A');
        doc.moveDown(0.5);
        
        doc.fontSize(10).fillColor('#777').text('CLIENTE');
        doc.fontSize(12).fillColor('#333').text(nameClient);
        doc.moveDown(0.5);

        doc.fontSize(10).fillColor('#777').text('DESCRIÇÃO DO TRABALHO');
        doc.fontSize(12).fillColor('#333').text(checkinData.workDescription || 'N/A');
        
        // Caixa de Datas (Simulando o grid)
        const yPos = 120;
        doc.rect(350, yPos, 200, 60).fill('#f4f4f4').stroke('#ddd');
        doc.fillColor('#777').fontSize(8).text('INÍCIO', 360, yPos + 10);
        doc.fillColor('#333').fontSize(10).text(`${dateCheckin} - ${hourCheckin}`, 360, yPos + 20);
        doc.fillColor('#777').fontSize(8).text('TÉRMINO', 360, yPos + 35);
        doc.fillColor('#333').fontSize(10).text(`${dateCheckout} - ${hourCheckout}`, 360, yPos + 45);

        doc.moveDown(4);

        // --- Aviso Insumos ---
        doc.rect(40, doc.y, 515, 30).fill('#fcf8e3').stroke('#faebcc');
        doc.fillColor('#8a6d3b').fontSize(10).text('ATENÇÃO: A listagem detalhada de insumos deve ser preenchida no Painel Restrito.', 50, doc.y - 20, { align: 'center' });
        doc.moveDown(2);

        // --- Função Auxiliar para Inserir Imagens Remotas ---
        const addImage = async (url, x, y, width) => {
            try {
                const response = await axios.get(url, { responseType: 'arraybuffer' });
                doc.image(response.data, x, y, { width: width });
            } catch (e) {
                doc.fontSize(8).text('Erro ao carregar imagem', x, y);
            }
        };

        // --- Evidências (Antes) ---
        doc.fillColor('#000').fontSize(14).text('EVIDÊNCIAS FOTOGRÁFICAS (ANTES)', { underline: true });
        doc.moveDown();
        // Exemplo simplificado de 2 imagens por linha
        if (checkinData.images && checkinData.images.length > 0) {
            for (let i = 0; i < checkinData.images.length; i++) {
                // Lógica de posicionamento simples para não sobrepor
                await addImage(checkinData.images[i], 40 + (i % 2 * 250), doc.y, 230);
                if (i % 2 !== 0) doc.moveDown(12); 
            }
        }
        doc.moveDown(10);

        // --- Assinatura ---
        if (assinatura) {
            const signatureY = doc.y + 50;
            // Se for base64, remove o prefixo "data:image/png;base64,"
            const base64Data = assinatura.replace(/^data:image\/\w+;base64,/, "");
            doc.image(Buffer.from(base64Data, 'base64'), 210, signatureY, { width: 150 });
            doc.moveTo(180, signatureY + 50).lineTo(400, signatureY + 50).stroke();
            doc.fontSize(10).text('Assinatura do Cliente', 180, signatureY + 55, { align: 'center', width: 220 });
        }

        doc.end();

        // Esperar o Stream terminar de gravar o arquivo
        await new Promise((resolve) => stream.on('finish', resolve));

        // 4. Deletar Checkin
        await Checkin.findByIdAndDelete(idCheckin);

        // 5. Envio de Notificação
        let transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 587,
            secure: false,
            auth: {
                user: 'sendermailservice01@gmail.com',
                pass:  "slht vdcm pfgi mmru"
            }
        });
        
        await transporter.sendMail({
            from: '"Sistema FB Empilhadeiras" <senderemailservice01@gmail.com>',
            to: 'financeirofbempilhadeiras@gmail.com',
            subject: `Relatório de Serviço Concluído - OS ${checkinData.numeracao}`,
            text: `O serviço para o cliente ${nameClient} foi finalizado. Segue o relatório detalhado em anexo.`,
            attachments: [{ filename: pdfName, path: outputPath }]
        });

        // 6. Limpeza do arquivo
        if (fs.existsSync(outputPath)) {
            fs.unlinkSync(outputPath);
        }

        res.status(201).json({ message: 'Processo concluído com PDFKit' });

    } catch (error) {
        console.error('Erro no CheckoutController:', error);
        res.status(500).json({ message: 'Erro interno no servidor', error: error.message });
    }
};

module.exports = CheckoutController;