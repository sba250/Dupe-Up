console.log('🚀 Dupify starting up...');

const GEMINI_API_KEY = 'AIzaSyBVBXVahhltmZ-QvOHqkNApOYkdO-s1Ues'; 
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 DOM ready');
    const searchBtn = document.getElementById('searchBtn');
    const productInput = document.getElementById('productInput');
    
    if (!searchBtn) {
        console.error('❌ Search button missing!');
        return;
    }
    
    console.log('✅ Search button found, attaching listeners');
    
    // Search button click
    searchBtn.addEventListener('click', findDupes);
    
    // Enter key
    if (productInput) {
        productInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') findDupes();
        });
    }
    
    // Example buttons
    document.querySelectorAll('.example-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            productInput.value = btn.getAttribute('data-product');
            findDupes();
        });
    });
});

async function findDupes() {
    const productInput = document.getElementById('productInput').value.trim();
    
    if (!productInput) {
        showError('Please enter a product name');
        return;
    }

    // Show loading, hide previous results/error
    document.getElementById('loading').classList.remove('hidden');
    document.getElementById('results').classList.add('hidden');
    document.getElementById('error').classList.add('hidden');
    
    try {
        console.log('🔍 Searching for:', productInput);
        const dupes = await fetchDupesFromGemini(productInput);
        console.log('✅ Found dupes:', dupes);
        displayResults(productInput, dupes);
    } catch (error) {
        console.error('❌ Error:', error);
        showError('Oops! ' + error.message);
    } finally {
        document.getElementById('loading').classList.add('hidden');
    }
}

async function fetchDupesFromGemini(product) {
    // Check if API key is set
    if (GEMINI_API_KEY != 'AIzaSyBVBXVahhltmZ-QvOHqkNApOYkdO-s1Ues') {
        throw new Error('Please add your Gemini API key to script.js');
    }

    const prompt = `You are a makeup expert with deep knowledge of product formulations, ingredients, and the Canadian beauty market. Find the 6 best, high-quality dupes (affordable alternatives) for "${product}".
    
For each dupe, provide:
- name: The product name and brand 
- price: Estimated price in CAD (be realistic for Canadian market, include taxes if known)
- tags: Array of 3-4 relevant tags from this list: ["cruelty-free", "vegan", "hypoallergenic", "natural", "non-gmo", "fragrance-free", "paraben-free", "sulfate-free", "sustainable", "dermatologist tested"]


For EACH dupe, you MUST analyze these 5 factors:
1. FORMULA/INGREDIENTS: What are the key ingredients? Are there similar active ingredients or base formulas? Mention specific comparable ingredients if possible.
2. AESTHETICS: Describe the visual appeal and sensory experience. How does it look in the package? What's the texture, scent, or unique visual elements? Does it have similar packaging vibes (luxe, minimalist, playful)
3. FUNCTION: Same coverage level (sheer/medium/full)? Same longevity? Same texture/feel on skin?
4. VALUE: How much product do you get (weight/volume)? Compare price per gram/ounce to show savings
5. REVIEWS: What do other users say? Mention average ratings or common praise (e.g., "4.5/5 stars on Sephora")

Return ONLY a valid JSON array with exactly 6 products in this exact format:
[
  {
    "id": "1",
    "name": "Full Product Name with Brand and Shade",
    "price": "$XX.CC CAD",
    "tags": ["tag1", "tag2", "tag3", "tag4"],
  }
]

EXAMPLE INPUT: "Charlotte Tilbury Pillow Talk Lipstick"
EXAMPLE OUTPUT:
[
  {
    "id": "1",
    "name": "Maybelline Superstay Matte Ink ",
    "brand": Just the brand name
    "price": "$12.99 CAD",
    "tags": ["cruelty-free", "vegan", "fragrance-free"],
  }
]

IMPORTANT RULES:
- Return ONLY the JSON array, nothing else
- Use REAL products that exist in the Canadian market (available at Sephora, Shoppers, London Drugs, etc.)
- Prices must be realistic CAD (check current prices if you know them)
- Descriptions must explain WHY it's a dupe, not just what it is
- Include both affordable drugstore options and mid-range alternatives
- For high-end products, include some drugstore dupes
- For drugstore products, include some similar mid-range options
- Make sure tags accurately reflect the product's actual attributes;
`;
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            contents: [{
                parts: [{
                    text: prompt
                }]
            }],
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 8192,
            }
        })
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error('🔴 API Error Details:', {
            status: response.status,
            statusText: response.statusText,
            body: errorText
        });
        throw new Error(`API request failed: ${response.status} - ${errorText.substring(0, 100)}`);
    }
    

    const data = await response.json();
    
    // Parse the JSON from Gemini's response
    const textResponse = data.candidates[0].content.parts[0].text;
    const cleanedResponse = textResponse
    .replace(/```json\n?/g, '')  // Remove ```json
    .replace(/```\n?/g, '')       // Remove closing ```
    .replace(/^json\s*/i, '')     // Remove "json" at start
    .trim();
   
    const firstBracket = cleanedResponse.indexOf('[');
    const lastBracket = cleanedResponse.lastIndexOf(']');

    if (firstBracket === -1 || lastBracket === -1) {
        console.error('No JSON array found in:', cleanedResponse);
        throw new Error('No valid JSON array in response');
    }

    const jsonString = cleanedResponse.substring(firstBracket, lastBracket + 1);
    console.log('Extracted JSON:', jsonString);

    try {
        return JSON.parse(jsonString);
    } catch (e) {
        console.error('Failed to parse JSON:', jsonString);
        throw new Error('Invalid JSON format');
    }
}

function displayResults(originalProduct, dupes) {
    document.getElementById('originalProduct').textContent = originalProduct;
    
    const grid = document.getElementById('dupesList');
    grid.innerHTML = '';
    
    dupes.forEach((dupe, index) => {
        const card = createDupeCard(dupe, index);
        grid.appendChild(card);
    });
    
    document.getElementById('results').classList.remove('hidden');
}

function createDupeCard(dupe, index) {
    const card = document.createElement('div');
    card.className = 'dupe-card';

    const searchQuery = encodeURIComponent(`${dupe.name} ${dupe.brand || ''} buy Canada`);
    const googleSearchUrl = `https://www.google.com/search?q=${searchQuery}`;
    
    card.innerHTML = `
        <div class="dupe-info">
            <div class="dupe-header">
                <span class="dupe-number">#${index + 1}</span>
            </div>
            <a href="${googleSearchUrl}" target="_blank" class="dupe-name-link">
                <div class="dupe-name">${dupe.name}</div>
            </a>
            <div class="dupe-price">${dupe.price}</div>
            <div class="tags">
                ${(dupe.tags || []).map(tag => `<span class="tag">${tag}</span>`).join('')}
            </div>
        </div>
    `;
    
    return card;
}

function showError(message) {
    const errorDiv = document.getElementById('error');
    errorDiv.textContent = message;
    errorDiv.classList.remove('hidden');
    document.getElementById('loading').classList.add('hidden');
}