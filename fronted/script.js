// script.js
const API_URL = 'http://localhost:3000';
let selectedCandidateId = null;
let currentVoterId = null;

// Función para cambiar entre pestañas
function openTab(tabName) {
    // Ocultar todos los contenidos de pestañas
    const tabContents = document.querySelectorAll('.tab-content');
    tabContents.forEach(tab => tab.classList.remove('active'));
    
    // Desactivar todos los botones de pestañas
    const tabButtons = document.querySelectorAll('.tab-button');
    tabButtons.forEach(button => button.classList.remove('active'));
    
    // Mostrar la pestaña seleccionada
    document.getElementById(tabName).classList.add('active');
    
    // Activar el botón de la pestaña
    event.currentTarget.classList.add('active');
    
    // Cargar datos específicos según la pestaña
    if (tabName === 'voter') {
        loadCandidatesForVoting();
    } else if (tabName === 'results') {
        loadResults();
    }
}

// Cargar candidatos desde la API
async function loadCandidates() {
    try {
        const response = await fetch(`${API_URL}/candidates`);
        const candidates = await response.json();
        return candidates;
    } catch (error) {
        console.error('Error al cargar candidatos:', error);
        return [];
    }
}

// Agregar un candidato
document.getElementById('candidate-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    
    const name = document.getElementById('name').value;
    const description = document.getElementById('description').value;
    
    try {
        const response = await fetch(`${API_URL}/candidates`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name, description })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            alert('Candidato agregado con éxito');
            document.getElementById('name').value = '';
            document.getElementById('description').value = '';
        } else {
            alert(`Error: ${result.message}`);
        }
    } catch (error) {
        console.error('Error al agregar candidato:', error);
        alert('Error al conectar con el servidor');
    }
});

// Verificar si un votante ya ha votado
async function checkVoter() {
    const voterId = document.getElementById('voter-id').value;
    
    if (!voterId) {
        showVoterMessage('Por favor, ingrese un identificador de votante', 'error');
        return;
    }
    
    try {
        // Primero verificar si el votante existe
        const response = await fetch(`${API_URL}/voters/${voterId}`);
        
        if (response.status === 404) {
            // Si no existe, registrar al votante
            const registerResponse = await fetch(`${API_URL}/voters`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ identifier: voterId })
            });
            
            if (registerResponse.ok) {
                currentVoterId = voterId;
                document.getElementById('voting-section').style.display = 'block';
                showVoterMessage('Votante registrado correctamente. Puede votar.', 'success');
            } else {
                showVoterMessage('Error al registrar votante', 'error');
            }
        } else {
            const result = await response.json();
            
            if (result.hasVoted) {
                showVoterMessage('Usted ya ha emitido su voto', 'error');
                document.getElementById('voting-section').style.display = 'none';
            } else {
                currentVoterId = voterId;
                document.getElementById('voting-section').style.display = 'block';
                showVoterMessage('Verificación exitosa. Puede votar', 'success');
            }
        }
    } catch (error) {
        console.error('Error al verificar votante:', error);
        showVoterMessage('Error al conectar con el servidor', 'error');
    }
}

// Mostrar mensaje para el votante
function showVoterMessage(message, type) {
    const messageElement = document.getElementById('voter-message');
    messageElement.textContent = message;
    messageElement.className = 'voter-message ' + type;
}

// Cargar candidatos para votar
async function loadCandidatesForVoting() {
    const candidates = await loadCandidates();
    const candidatesList = document.getElementById('candidates-list');
    candidatesList.innerHTML = '';
    
    candidates.forEach(candidate => {
        const card = document.createElement('div');
        card.className = 'card';
        card.dataset.id = candidate._id;
        card.innerHTML = `
            <h3>${candidate.name}</h3>
            <p>${candidate.description}</p>
        `;
        
        card.addEventListener('click', () => {
            // Deseleccionar todas las tarjetas
            document.querySelectorAll('.card').forEach(c => c.classList.remove('selected'));
            
            // Seleccionar esta tarjeta
            card.classList.add('selected');
            selectedCandidateId = candidate._id;
        });
        
        candidatesList.appendChild(card);
    });
}

// Emitir voto
async function castVote() {
    if (!currentVoterId) {
        showVoterMessage('Por favor, verifique su identidad primero', 'error');
        return;
    }
    
    if (!selectedCandidateId) {
        showVoterMessage('Por favor, seleccione un candidato', 'error');
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/vote`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                voterId: currentVoterId,
                candidateId: selectedCandidateId
            })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showVoterMessage('Voto registrado con éxito', 'success');
            document.getElementById('voting-section').style.display = 'none';
            selectedCandidateId = null;
            
            // Cambiar a la pestaña de resultados
            setTimeout(() => {
                openTab('results');
                document.querySelectorAll('.tab-button')[2].classList.add('active');
            }, 1500);
        } else {
            showVoterMessage(`Error: ${result.message}`, 'error');
        }
    } catch (error) {
        console.error('Error al emitir voto:', error);
        showVoterMessage('Error al conectar con el servidor', 'error');
    }
}

// Cargar resultados
async function loadResults() {
    try {
        const response = await fetch(`${API_URL}/results`);
        const data = await response.json();
        
        const resultsList = document.getElementById('results-list');
        resultsList.innerHTML = '';
        
        // Calcular el total de votos para las barras de progreso
        const totalVotes = data.candidates.reduce((sum, candidate) => sum + candidate.votes, 0);
        
        data.candidates.forEach(candidate => {
            const card = document.createElement('div');
            card.className = 'results-card';
            
            const votePercentage = totalVotes > 0 ? (candidate.votes / totalVotes) * 100 : 0;
            
            card.innerHTML = `
                <div>
                    <h3>${candidate.name}</h3>
                    <p>Votos: ${candidate.votes}</p>
                </div>
                <div style="width: 60%;">
                    <div class="progress-bar">
                        <div class="progress" style="width: ${votePercentage}%">
                            ${votePercentage.toFixed(1)}%
                        </div>
                    </div>
                </div>
            `;
            
            resultsList.appendChild(card);
        });
        
        // Mostrar al ganador si hay votos
        const winnerSection = document.getElementById('winner-section');
        const winnerElement = document.getElementById('winner');
        
        if (data.winner && totalVotes > 0) {
            winnerSection.style.display = 'block';
            winnerElement.innerHTML = `
                <h2>${data.winner.name}</h2>
                <p>${data.winner.description}</p>
                <p>Total de votos: ${data.winner.votes}</p>
            `;
        } else {
            winnerSection.style.display = 'none';
        }
    } catch (error) {
        console.error('Error al cargar resultados:', error);
    }
}

// Inicializar la página
document.addEventListener('DOMContentLoaded', () => {
    // Inicialmente mostrar la pestaña de administración
    openTab('admin');
});