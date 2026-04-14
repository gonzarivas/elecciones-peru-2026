export async function onRequest(context) {
  const { request, params } = context;
  const url = new URL(request.url);
  
  // Extraemos la ruta que viene después de /api-onpe/
  const path = params.path.join('/');
  const targetUrl = new URL(`https://resultadoelectoral.onpe.gob.pe/${path}${url.search}`);
  
  console.log(`Proxying request to: ${targetUrl.toString()}`);

  // Creamos una nueva petición con un User-Agent de navegador para evitar bloqueos
  const newRequest = new Request(targetUrl, {
    method: request.method,
    headers: {
      ...Object.fromEntries(request.headers),
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    },
    body: request.body,
    duplex: 'half'
  });

  try {
    const response = await fetch(newRequest);
    
    // Devolvemos la respuesta tal cual (incluyendo headers de CORS si los hay)
    const newResponse = new Response(response.body, response);
    
    // Aseguramos que permitimos CORS si es necesario (aunque al ser el mismo dominio no debería importar)
    newResponse.headers.set('Access-Control-Allow-Origin', '*');
    
    return newResponse;
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
