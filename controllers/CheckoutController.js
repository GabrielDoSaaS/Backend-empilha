const Checkout = require('../models/Checkout');
const Checkin = require('../models/Checkin');
const User = require('../models/User');
const { Resend } = require('resend'); // Alterado para o SDK do Resend
const PDFDocument = require('pdfkit');
const axios = require('axios');
const path = require('path');
const fs = require('fs');

const resend = new Resend('re_MbPF4JYv_G7FbVeGiG5hXae1qzHQH9igC');

const CheckoutController = async (req, res) => {
    const { idCheckin, tecId, nameClient, images, videos, assinatura } = req.body;
    const outputPath = path.join(__dirname, '..', `relatorio_${idCheckin}.pdf`);

    try {
        // 1. Coleta de dados em paralelo
        const [checkinData, userData] = await Promise.all([
            Checkin.findById(idCheckin),
            User.findById(tecId)
        ]);

        if (!checkinData) {
            return res.status(404).json({ message: 'Checkin não encontrado' });
        }

        // --- Pré-processamento de Imagens ---
        const imageUrls = checkinData.images || [];
        const imageBuffers = await Promise.all(
            imageUrls.map(async (url) => {
                try {
                    const resp = await axios.get(url, { responseType: 'arraybuffer', timeout: 8000 });
                    return resp.data;
                } catch (e) {
                    console.error(`Erro ao baixar imagem: ${url}`);
                    return null;
                }
            })
        );

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

        // 3. Geração do PDF
        const pdfName = `relatorio_${checkinData.numeracao || idCheckin}.pdf`;
        const doc = new PDFDocument({ size: 'A4', margin: 40 });
        const stream = fs.createWriteStream(outputPath);
        
        doc.pipe(stream);

        // Cabeçalho e conteúdo do PDF (Mantido original)
        doc.fontSize(20).text('ORDEM DE SERVIÇO', { continued: true });
        doc.fontSize(10).text(`Nº CONTROLE: ${checkinData.numeracao || 'N/A'}`, { align: 'right' });
        doc.moveDown().moveTo(40, doc.y).lineTo(555, doc.y).stroke();
        doc.moveDown();

        doc.fontSize(10).fillColor('#777').text('TÉCNICO RESPONSÁVEL');
        doc.fontSize(12).fillColor('#333').text(userData ? userData.name : 'N/A');
        doc.moveDown(0.5);
        
        doc.fontSize(10).fillColor('#777').text('CLIENTE');
        doc.fontSize(12).fillColor('#333').text(nameClient);
        doc.moveDown(0.5);

        doc.fontSize(10).fillColor('#777').text('DESCRIÇÃO DO TRABALHO');
        doc.fontSize(12).fillColor('#333').text(checkinData.workDescription || 'N/A');
        
        const yPos = 120;
        doc.rect(350, yPos, 200, 60).fill('#f4f4f4').stroke('#ddd');
        doc.fillColor('#777').fontSize(8).text('INÍCIO', 360, yPos + 10);
        doc.fillColor('#333').fontSize(10).text(`${dateCheckin} - ${hourCheckin}`, 360, yPos + 20);
        doc.fillColor('#777').fontSize(8).text('TÉRMINO', 360, yPos + 35);
        doc.fillColor('#333').fontSize(10).text(`${dateCheckout} - ${hourCheckout}`, 360, yPos + 45);

        doc.moveDown(4);

        doc.fillColor('#000').fontSize(14).text('EVIDÊNCIAS FOTOGRÁFICAS', { underline: true });
        doc.moveDown();

        imageBuffers.forEach((buf, index) => {
            if (buf) {
                if (index > 0 && index % 2 === 0) doc.moveDown(150);
                const xPos = index % 2 === 0 ? 40 : 300;
                doc.image(buf, xPos, doc.y, { width: 230 });
            }
        });

        if (assinatura) {
            doc.addPage();
            const base64Data = assinatura.replace(/^data:image\/\w+;base64,/, "");
            doc.image(Buffer.from(base64Data, 'base64'), 210, doc.y + 20, { width: 150 });
            doc.moveTo(180, doc.y + 70).lineTo(400, doc.y + 70).stroke();
            doc.fontSize(10).text('Assinatura do Cliente', 180, doc.y + 75, { align: 'center', width: 220 });
        }

        doc.end();

        // Espera o arquivo ser escrito completamente
        await new Promise((resolve, reject) => {
            stream.on('finish', resolve);
            stream.on('error', reject);
        });

        // 4. Envio de E-mail via Resend
        const pdfBuffer = fs.readFileSync(outputPath);

        await resend.emails.send({
            from: 'onboarding@resend.dev', // Recomenda-se usar um domínio verificado no futuro
            to: 'financeirofbempilhadeiras@gmail.com',
            subject: `Relatório de Serviço Concluído - OS ${checkinData.numeracao || 'N/A'}`,
            html: `<p>O serviço para o cliente <strong>${nameClient}</strong> foi finalizado com sucesso.</p>
                   <p>Segue em anexo o relatório detalhado da Ordem de Serviço.</p>`,
            attachments: [
                {
                    filename: pdfName,
                    content: pdfBuffer,
                },
            ],
        });

        // 5. Limpeza e Finalização
        await Checkin.findByIdAndDelete(idCheckin);
        if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);

        return res.status(201).json({ message: 'Checkout realizado com sucesso e e-mail enviado via Resend.' });

    } catch (error) {
        console.error('Erro no CheckoutController:', error);
        if (fs.existsSync(outputPath)) {
            try { fs.unlinkSync(outputPath); } catch (e) { /* ignore */ }
        }
        return res.status(500).json({ message: 'Erro interno', error: error.message });
    }
};

module.exports = CheckoutController;