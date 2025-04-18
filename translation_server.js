// Este código es un servidor Node.js que utiliza express y la biblioteca @xenova/transformers para traducir texto de inglés a español utilizando el modelo MarianMT de Hugging Face.
const express = require('express');
const bodyParser = require('body-parser'); //middleware para procesar datos JSON enviados en las solicitudes HTTP
const { pipeline } = require('@xenova/transformers'); //funcion de la biblioteca xenova transformers que permite cargar y ejecutar modelos de hugging face

// Configuracion del servidor
const app = express(); //instancia de express para manejar rutas y solicitudes
app.use(bodyParser.json()); //configura el servidor para procesar datos JSON en las solicitudes

//variable para almacenar pipelines de traduccion cargados
const pipelines = {}; //los modelos de traduccion se almacenan en el pipeline para no tener que cargar el mismo modelo varias veces

// Cargar el modelo MarianMT para traducción
async function getTranslator(sourceLang, targetLang) {
    const modelName = `Helsinki-NLP/opus-mt-${sourceLang}-${targetLang}`;
    if (!pipelines[modelName]) {
        console.log(`Cargando modelo: ${modelName}...`);
        pipelines[modelName] = await pipeline('translation', modelName);
        console.log(`Modelo ${modelName} cargado.`);
    }
    return pipelines[modelName];
}


// Endpoint para traducir texto
app.post('/translate', async (req, res) => { // /translate es un endpoint POST que recibe texto para traducir
    const { text, source_lang, target_lang} = req.body; //req.body es el cuerpo de la solicitud que contiene el texto a traducir

    //valida si se porporciono texto, si no se proporciona, devuelve un error 400
    if (!text) {
        return res.status(400).json({ error: 'No se proporcionó texto para traducir' });
    }

    //
    if (!source_lang || !target_lang) {
        return res.status(400).json({ error: 'No se proporcionó el idioma de origen o destino' });
    } 

    //valida si el texto es una cadena, si no lo es, devuelve un error 400
    if (typeof text !== 'string') {
        return res.status(400).json({ error: 'El texto debe ser una cadena' });
    }

    //manejo de errores... si ocurre un error durante la traducción, devuelve un error 500
    //si no ocurre ningun error, devuelve el texto traducido en formato JSON
    try {
        //obtener el pipeline de traduccion 
        const translator = await getTranslator(source_lang, target_lang); //obtiene el pipeline de traduccion para el idioma de origen y destino
        
        //traducir el texto usando el pipeline de traduccion 
        const result = await translator(text);
        res.json({ translated_text: result[0].translation_text });
    } catch (error) {
        console.error('Error al traducir:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Iniciar el servidor
const PORT = 5000; //define el puerto en el que se ejecutara el servidor 
app.listen(PORT, () => {
    console.log(`Servidor de traducción corriendo en http://localhost:${PORT}`);
});

/*Resumen del flujo
Inicio del servidor:

El servidor se ejecuta en el puerto 5000.
Carga el modelo MarianMT para traducción de inglés a español.
Solicitud de traducción:

El cliente envía una solicitud POST a /translate con un texto en el cuerpo.
El servidor traduce el texto usando el modelo MarianMT y devuelve el resultado.
Respuesta:

Si la traducción es exitosa, el servidor responde con el texto traducido.
Si ocurre un error, devuelve un mensaje de error
*/