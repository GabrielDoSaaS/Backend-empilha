const routes = require('express').Router();
const { RegisterUser, LoginUser } = require('../controllers/AuthControllers');
const WorkDescription = require('../controllers/WorkDescription');
const ToolsController = require('../controllers/ToolsControllers');
const CheckinController = require('../controllers/CheckinController');
const CheckoutController = require('../controllers/CheckoutController');
const User = require('../models/User');
const Checkout = require('../models/Checkout');
const Relatory = require('../models/Relatory');
const Checkin = require('../models/Checkin');

//External controllers for user management
routes.post('/return-users', async (req, res) => {
    try {
        console.log('is read')
        const users = await User.find();
        res.status(200).json(users);
    }
    catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

routes.delete('/delete-user/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const deletedUser = await User.findByIdAndDelete(id);
        if (!deletedUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.status(200).json({ message: 'User deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

/* ----------------------- Application Routes ---------------------*/

//Auth Routes 
routes.post('/register', RegisterUser);
routes.post('/login', LoginUser);

//Tools Routes
routes.post('/tools', ToolsController.CreateTool);
routes.get('/tools', ToolsController.GetTools);
routes.delete('/tools/:id', ToolsController.DeleteTool);

//Work Description Route
routes.post('/work-description', WorkDescription.WorkDescription);

//Checkin and Checkout Routes
routes.post('/checkin', CheckinController.InitCheckin);
routes.get('/checkins', CheckinController.GetAllCheckins);
routes.get('/checkins/tec/:tecId', CheckinController.GetCheckinByTecId);

routes.post('/checkout', CheckoutController);
routes.get('/get-all-checkouts', async (req, res) => {
    const checkouts = await Checkout.find();
    res.status(200).json(checkouts);
});

routes.get('/get-checkouts/:tecId', async (req, res) => {
    const { tecId } = req.params;
    const checkouts = await Checkout.find({ tecId });
    res.status(200).json(checkouts);
})

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
const nodemailer = require('nodemailer');

routes.post('/generate-pdf', async (req, res) => {
    try {
        const { checkoutId, insumes } = req.body;

        // 1. Busca os dados necessários
        const checkout = await Checkout.findById(checkoutId);
        if (!checkout) {
            return res.status(404).json({ message: 'Checkout not found' });
        }

        // Atualiza os insumos no checkout
        checkout.insumes = insumes;
        await checkout.save();

        // Busca dados do Técnico
        const userData = await User.findById(checkout.tecId);
        
        // Formatação de datas
        const dateCheckout = new Date(checkout.date).toLocaleDateString('pt-BR');
        const hourCheckout = checkout.hourCheckout;

        // 2. Geração da Tabela de Insumos em HTML
        const insumesRows = insumes.map(item => `
            <tr>
                <td style="border: 1px solid #ddd; padding: 8px;">${item.name}</td>
                <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${item.unit}</td>
                <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${item.qtd}</td>
            </tr>
        `).join('');

        const insumesTable = `
            <h3>Listagem de Insumos Utilizados</h3>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 12px;">
                <thead>
                    <tr style="background-color: #f2f2f2;">
                        <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Nome</th>
                        <th style="border: 1px solid #ddd; padding: 8px;">Unidade de Medida</th>
                        <th style="border: 1px solid #ddd; padding: 8px;">Quantidade</th>
                    </tr>
                </thead>
                <tbody>
                    ${insumesRows}
                </tbody>
            </table>
        `;

        // 3. Estrutura do HTML para o Puppeteer
        const htmlContent = `
            <html>
            <head>
                <style>
                    body { font-family: 'Helvetica', sans-serif; padding: 40px; color: #333; line-height: 1.4; }
                    .header-table { width: 100%; border-bottom: 2px solid #000; margin-bottom: 20px; }
                    .info-grid { display: flex; justify-content: space-between; margin-bottom: 20px; }
                    .label { font-weight: bold; font-size: 10px; color: #777; text-transform: uppercase; }
                    .value { font-size: 14px; margin-bottom: 8px; }
                    .photo-grid { display: flex; flex-wrap: wrap; gap: 10px; margin: 10px 0 25px 0; }
                    .photo-grid img { width: 230px; height: 170px; object-fit: cover; border: 1px solid #ddd; border-radius: 4px; }
                    .signature-section { margin-top: 50px; text-align: center; }
                    .signature-image { width: 160px; height: auto; margin-bottom: -10px; }
                    .signature-line { border-top: 1px solid #000; width: 280px; margin: 0 auto; padding-top: 5px; font-weight: bold; }
                    h3 { border-left: 4px solid #000; padding-left: 10px; text-transform: uppercase; font-size: 16px; margin-top: 30px; }
                </style>
            </head>
            <body>
                <table class="header-table">
                    <tr>
                        <td><h1>RELATÓRIO FINAL DE SERVIÇO</h1></td>
                        <td style="text-align: right;"><strong>REF: ${checkout._id}</strong></td>
                    </tr>
                </table>

                <div class="info-grid">
                    <div style="width: 50%;">
                        <div class="label">Técnico Responsável</div>
                        <div class="value">${userData ? userData.name : 'N/A'}</div>
                        <div class="label">Cliente</div>
                        <div class="value">${checkout.nameClient}</div>
                    </div>
                    <div style="width: 40%; background: #f4f4f4; padding: 15px; border-radius: 5px;">
                        <div class="label">Finalizado em</div>
                        <div class="value">${dateCheckout} - ${hourCheckout}</div>
                    </div>
                </div>

                ${insumesTable}

                <h3>Evidências do Checkout</h3>
                <div class="photo-grid">
                    ${checkout.images.map(img => `<img src="${img}" />`).join('')}
                </div>

                <div class="signature-section">
                    <img src="${checkout.assinatura}" class="signature-image" />
                    <div class="signature-line">Assinatura do Cliente</div>
                </div>
            </body>
            </html>
        `;

        // 4. Inicia Puppeteer e gera o PDF (Buffer)
        const browser = await puppeteer.launch({ headless: "new" });
        const page = await browser.newPage();
        await page.setContent(htmlContent);
        const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
        await browser.close();

        // 5. Salva no modelo Relatory (Base64 para o Banco de Dados)
        const pdfBase64 = pdfBuffer.toString('base64');
        const relatory = new Relatory({
            tecId: checkout.tecId,
            checkoutId: checkout._id,
            pdf: `data:application/pdf;base64,${pdfBase64}` 
        });
        await relatory.save();

        // 6. Envio de E-mail (Anexando o Buffer diretamente)
        let transporter = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 465,
            secure: true,
            auth: {
                user: 'sendermailservice01@gmail.com',
                pass: "slht vdcm pfgi mmru"
            }
        });

        const pdfName = `relatorio_final_${checkout._id}.pdf`;

        await transporter.sendMail({
            from: '"Sistema de Gestão" <sendermailservice01@gmail.com>',
            to: 'financeirofbempilhadeiras@gmail.com',
            subject: `Relatório Final de Insumos - Cliente: ${checkout.nameClient}`,
            text: `O relatório final com a listagem de insumos para o cliente ${checkout.nameClient} foi gerado e está disponível em anexo.`,
            attachments: [
                {
                    filename: pdfName,
                    content: pdfBuffer, // Enviando o buffer gerado pelo Puppeteer
                    contentType: 'application/pdf'
                }
            ]
        });

        res.status(200).json({ 
            message: 'PDF gerado, salvo e enviado por e-mail com sucesso!', 
            relatoryId: relatory._id 
        });

    } catch (error) {
        console.error('Erro ao gerar/enviar PDF:', error);
        res.status(500).json({ message: 'Erro interno no servidor', error: error.message });
    }
});

routes.get('/relatory/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const relatory = await Relatory.findOne({checkoutId: id});

        res.send(relatory);
    } catch (error) {
        res.status(500).json({ message: 'Erro interno no servidor', error: error.message });
    }
}
)
    


module.exports = routes;