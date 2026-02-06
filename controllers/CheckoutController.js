const Checkout = require('../models/Checkout');
const Checkin = require('../models/Checkin');
const User = require('../models/User');
const nodemailer = require('nodemailer');
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs'); // Importado para caso queira manipular o arquivo depois

const CheckoutController = async (req, res) => {
    const { idCheckin, tecId, nameClient, images, videos, assinatura } = req.body;

    try {
        // 1. Coleta de dados pré-deleção
        const checkinData = await Checkin.findById(idCheckin);
        const userData = await User.findById(tecId);

        if (!checkinData) {
            return res.status(404).json({ message: 'Checkin não encontrado' });
        }

        // Formatação de Datas e Horários
        const now = new Date();
        const dateCheckout = now.toLocaleDateString('pt-BR');
        const hourCheckout = now.toLocaleTimeString('pt-BR');
        const dateCheckin = new Date(checkinData.date).toLocaleDateString('pt-BR');
        const hourCheckin = checkinData.hourCheckin;

        // 2. Salvar o Checkout
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

        // 3. Geração do PDF com Puppeteer
        const pdfName = `relatorio_${checkinData.numeracao || idCheckin}.pdf`;
        const outputPath = path.join(__dirname, '..', pdfName);

        const browser = await puppeteer.launch({ headless: "new" });
        const page = await browser.newPage();

        const htmlContent = `
            <html>
            <head>
                <style>
                    body { font-family: 'Helvetica', sans-serif; padding: 40px; color: #333; line-height: 1.4; }
                    .header-table { width: 100%; border-bottom: 2px solid #000; margin-bottom: 20px; }
                    .info-grid { display: flex; justify-content: space-between; margin-bottom: 20px; }
                    .label { font-weight: bold; font-size: 10px; color: #777; text-transform: uppercase; }
                    .value { font-size: 14px; margin-bottom: 8px; }
                    .insumos-warning { 
                        background-color: #fcf8e3; 
                        border: 1px solid #faebcc; 
                        color: #8a6d3b; 
                        padding: 12px; 
                        margin: 20px 0; 
                        border-radius: 4px;
                        font-size: 13px;
                        text-align: center;
                        font-weight: bold;
                    }
                    .photo-grid { display: flex; flex-wrap: wrap; gap: 10px; margin: 10px 0 25px 0; }
                    .photo-grid img { width: 230px; height: 170px; object-fit: cover; border: 1px solid #ddd; border-radius: 4px; }
                    .signature-section { margin-top: 50px; text-align: center; }
                    .signature-image { width: 160px; height: auto; margin-bottom: -10px; }
                    .signature-line { border-top: 1px solid #000; width: 280px; margin: 0 auto; padding-top: 5px; font-weight: bold; }
                    h3 { border-left: 4px solid #000; padding-left: 10px; text-transform: uppercase; font-size: 16px; }
                </style>
            </head>
            <body>
                <table class="header-table">
                    <tr>
                        <td><h1>ORDEM DE SERVIÇO</h1></td>
                        <td style="text-align: right;"><strong>Nº CONTROLE: ${checkinData.numeracao || 'N/A'}</strong></td>
                    </tr>
                </table>

                <div class="info-grid">
                    <div style="width: 50%;">
                        <div class="label">Técnico Responsável</div>
                        <div class="value">${userData ? userData.name : 'N/A'}</div>
                        <div class="label">Cliente</div>
                        <div class="value">${nameClient}</div>
                        <div class="label">Descrição do Trabalho</div>
                        <div class="value">${checkinData.workDescription || 'N/A'}</div>
                    </div>
                    <div style="width: 40%; background: #f4f4f4; padding: 15px; border-radius: 5px;">
                        <div class="label">Início</div>
                        <div class="value">${dateCheckin} - ${hourCheckin}</div>
                        <div class="label">Término</div>
                        <div class="value">${dateCheckout} - ${hourCheckout}</div>
                    </div>
                </div>

                <div class="insumos-warning">
                    ⚠️ ATENÇÃO: A listagem detalhada de insumos utilizados deve ser preenchida obrigatoriamente através do Painel Restrito do sistema.
                </div>

                <h3>Evidências Fotográficas (Antes)</h3>
                <div class="photo-grid">
                    ${checkinData.images.map(img => `<img src="${img}" />`).join('')}
                </div>

                <h3>Evidências Fotográficas (Depois)</h3>
                <div class="photo-grid">
                    ${images.map(img => `<img src="${img}" />`).join('')}
                </div>

                <div class="signature-section">
                    <img src="${assinatura}" class="signature-image" />
                    <div class="signature-line">Assinatura do Cliente</div>
                    <p style="font-size: 9px; color: #999;">Documento gerado em ${dateCheckout} às ${hourCheckout}</p>
                </div>
            </body>
            </html>
        `;

        await page.setContent(htmlContent);
        await page.pdf({ path: outputPath, format: 'A4', printBackground: true });
        await browser.close();

        // 4. Finalização do processo (Deletar Checkin)
        await Checkin.findByIdAndDelete(idCheckin);

        // 5. Envio de Notificação com Anexo
        let transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 465,
            secure: true,
            auth: {
                user: 'sendermailservice01@gmail.com',
                pass: "slht vdcm pfgi mmru"
            }
        });
        
        await transporter.sendMail({
            from: 'senderemailservice01@gmail.com',
            to: 'financeirofbempilhadeiras@gmail.com',
            subject: `Relatório de Serviço Concluído - OS ${checkinData.numeracao}`,
            text: `O serviço para o cliente ${nameClient} foi finalizado. Segue o relatório detalhado em anexo.`,
            attachments: [
                {
                    filename: pdfName,
                    path: outputPath // Caminho onde o Puppeteer salvou o arquivo
                }
            ]
        });

        // Opcional: Se você quiser deletar o arquivo do servidor após o envio para não acumular lixo:
        // fs.unlinkSync(outputPath);

        res.status(201).json({ message: 'Processo concluído, PDF gerado e enviado por e-mail', arquivo: pdfName });

    } catch (error) {
        console.error('Erro no CheckoutController:', error);
        res.status(500).json({ message: 'Erro interno no servidor', error: error.message });
    }
};

module.exports = CheckoutController;