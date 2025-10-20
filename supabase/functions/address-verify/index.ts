import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { address } = await req.json()
    
    // Addressr.io API - Free tier available
    // Register at https://www.addressr.io/ for API key
    const ADDRESSR_API_KEY = Deno.env.get('ADDRESSR_API_KEY') || 'YOUR_ADDRESSR_API_KEY'
    const apiUrl = `https://api.addressr.io/au/addresses?q=${encodeURIComponent(address)}&api_key=${ADDRESSR_API_KEY}`
    
    const response = await fetch(apiUrl)
    
    if (response.ok) {
      const data = await response.json()
      
      if (data && data.results) {
        const suggestions = data.results.map((result: any) => ({
          fullAddress: result.address,
          streetNumber: result.street_number,
          streetName: result.street_name,
          streetType: result.street_type,
          suburb: result.locality,
          state: result.state,
          postcode: result.postcode
        }))
        
        return new Response(
          JSON.stringify({ suggestions }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }
    
    // Fallback mock data for testing
    return new Response(
      JSON.stringify({
        suggestions: [
          {
            fullAddress: '123 George Street, Sydney NSW 2000',
            streetNumber: '123',
            streetName: 'George',
            streetType: 'Street',
            suburb: 'Sydney',
            state: 'NSW',
            postcode: '2000'
          },
          {
            fullAddress: '125 George Street, Sydney NSW 2000',
            streetNumber: '125',
            streetName: 'George',
            streetType: 'Street',
            suburb: 'Sydney',
            state: 'NSW',
            postcode: '2000'
          }
        ]
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})