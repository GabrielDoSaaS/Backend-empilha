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

const pdfLib = require('html-pdf-node'); // Biblioteca mais leve

const { Resend } = require('resend');
const resend = new Resend('re_MbPF4JYv_G7FbVeGiG5hXae1qzHQH9igC');

routes.post('/generate-pdf', async (req, res) => {
    try {
        const { checkoutId, insumes, price } = req.body; // 'price' recebido aqui

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

        // 3. Estrutura do HTML (Com a inclusão do campo de preço)
        const htmlContent = `
            <html>
            <head>
                <meta charset="UTF-8">
                <style>
                    body { font-family: 'Helvetica', sans-serif; padding: 20px; color: #333; line-height: 1.4; }
                    .header-table { width: 100%; border-bottom: 2px solid #000; margin-bottom: 20px; }
                    .info-grid { display: flex; width: 100%; margin-bottom: 20px; }
                    .info-col { width: 50%; }
                    .label { font-weight: bold; font-size: 10px; color: #777; text-transform: uppercase; }
                    .value { font-size: 14px; margin-bottom: 8px; }
                    .price-box { background: #e8f5e9; padding: 10px; border: 1px solid #2e7d32; border-radius: 5px; margin-top: 10px; }
                    .photo-grid { width: 100%; margin: 10px 0; }
                    .photo-grid img { width: 200px; margin: 5px; border: 1px solid #ddd; border-radius: 4px; }
                    .signature-section { margin-top: 30px; text-align: center; width: 100%; }
                    .signature-image { width: 150px; height: auto; }
                    .signature-line { border-top: 1px solid #000; width: 250px; margin: 5px auto 0; font-weight: bold; font-size: 12px; }
                    h3 { border-left: 4px solid #000; padding-left: 10px; text-transform: uppercase; font-size: 16px; margin-top: 20px; }
                </style>
            </head>
            <body>
                <table class="header-table">
                    <tr>
                        <td><h1 style="font-size: 22px;">RELATÓRIO FINAL DE SERVIÇO</h1></td>
                        <td style="text-align: right;"><strong>REF: ${checkout._id}</strong></td>
                    </tr>
                </table>

                <div class="info-grid">
                    <div class="info-col">
                        <div class="label">Técnico Responsável</div>
                        <div class="value">${userData ? userData.name : 'N/A'}</div>
                        <div class="label">Cliente</div>
                        <div class="value">${checkout.nameClient}</div>
                    </div>
                    <div class="info-col" style="background: #f4f4f4; padding: 10px; border-radius: 5px;">
                        <div class="label">Finalizado em</div>
                        <div class="value">${dateCheckout} - ${hourCheckout}</div>
                        
                        <div class="price-box">
                            <div class="label" style="color: #2e7d32;">Valor Total do Serviço</div>
                            <div class="value" style="font-weight: bold; font-size: 18px;">R$ ${price || '0,00'}</div>
                        </div>
                    </div>
                </div>

                ${insumesTable}

                <h3>Evidências do Checkout</h3>
                <div class="photo-grid">
                    ${checkout.images.map(img => `<img src="${img}" />`).join('')}
                </div>

                <div class="signature-section">
                    ${checkout.assinatura ? `<img src="${checkout.assinatura}" class="signature-image" />` : ''}
                    <div class="signature-line">Assinatura do Cliente</div>
                </div>
            </body>
            </html>
        `;

        // 4. Geração do PDF
        const options = { format: 'A4', printBackground: true, margin: { top: "20px", bottom: "20px" } };
        const file = { content: htmlContent };

        const pdfBuffer = await pdfLib.generatePdf(file, options);

        // 5. Salva no modelo Relatory
        const pdfBase64 = pdfBuffer.toString('base64');
        const relatory = new Relatory({
            tecId: checkout.tecId,
            checkoutId: checkout._id,
            pdf: `data:application/pdf;base64,${pdfBase64}` 
        });
        await relatory.save();

        // 6. Envio de E-mail via Resend
        await resend.emails.send({
            from: 'onboarding@resend.dev',
            to: 'financeirofbempilhadeiras@gmail.com',
            subject: `Relatório Final - ${checkout.nameClient}`,
            html: `
                <p>Relatório gerado com sucesso para o cliente <strong>${checkout.nameClient}</strong>.</p>
                <p><strong>Valor Total:</strong> R$ ${price || 'N/A'}</p>
                <p>O arquivo PDF detalhado está em anexo.</p>
            `,
            attachments: [
                {
                    filename: `relatorio_${checkout._id}.pdf`,
                    content: pdfBuffer,
                }
            ]
        });

        res.status(200).json({ 
            message: 'PDF gerado e enviado com sucesso via Resend!', 
            relatoryId: relatory._id 
        });

    } catch (error) {
        console.error('Erro:', error);
        res.status(500).json({ message: 'Erro interno', error: error.message });
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