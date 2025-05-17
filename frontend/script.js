const API_URL = 'http://localhost:3000';
let selectedCandidateId = null;
let currentVoterId = null;

// Función para cambiar entre pestañas
function openTab(tabName, event) {
    const tabContents = document.querySelectorAll('.tab-content');
    tabContents.forEach(tab => tab.classList.remove('active'));

    const tabButtons = document.querySelectorAll('.tab-button');
    tabButtons.forEach(button => button.classList.remove('active'));

    document.getElementById(tabName).classList.add('active');

    if (event) {
        event.currentTarget.classList.add('active');
    } else {
        document.querySelector(`.tab-button[onclick*="openTab('${tabName}')"]`).classList.add('active');
    }

    if (tabName === 'voter') {
        loadCandidatesForVoting();
    } else if (tabName === 'results') {
        loadResults();
    }
}

async function loadCandidates() {
    try {
        const response = await fetch(`${API_URL}/candidates`);
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Error al cargar candidatos:', error);
        return [];
    }
}

document.getElementById('candidate-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const name = document.getElementById('name').value.trim();
    const description = document.getElementById('description').value.trim();

    if (!name || !description) {
        alert('Por favor, complete todos los campos');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/candidates`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, description })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Error al agregar candidato');
        }

        alert('Candidato agregado con éxito');
        document.getElementById('name').value = '';
        document.getElementById('description').value = '';
    } catch (error) {
        console.error('Error al agregar candidato:', error);
        alert(`Error: ${error.message || 'Error al conectar con el servidor'}`);
    }
});

async function checkVoter() {
    const voterId = document.getElementById('voter-id').value.trim();

    if (!voterId) {
        showVoterMessage('Por favor, ingrese un identificador de votante', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/voters/${voterId}`);
        if (response.status === 404) {
            const registerResponse = await fetch(`${API_URL}/voters`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ identifier: voterId })
            });

            if (registerResponse.ok) {
                currentVoterId = voterId;
                document.getElementById('voting-section').style.display = 'block';
                showVoterMessage('Votante registrado correctamente. Puede votar.', 'success');
                loadCandidatesForVoting();
            } else {
                const errorData = await registerResponse.json();
                showVoterMessage(`Error al registrar votante: ${errorData.message || ''}`, 'error');
            }
        } else if (response.ok) {
            const result = await response.json();

            if (result.hasVoted) {
                showVoterMessage('Usted ya ha emitido su voto', 'error');
                document.getElementById('voting-section').style.display = 'none';
            } else {
                currentVoterId = voterId;
                document.getElementById('voting-section').style.display = 'block';
                showVoterMessage('Verificación exitosa. Puede votar', 'success');
                loadCandidatesForVoting();
            }
        } else {
            const errorData = await response.json();
            showVoterMessage(`Error: ${errorData.message || 'Error al verificar votante'}`, 'error');
        }
    } catch (error) {
        console.error('Error al verificar votante:', error);
        showVoterMessage(`Error: ${error.message || 'Error al conectar con el servidor'}`, 'error');
    }
}

function showVoterMessage(message, type) {
    const messageElement = document.getElementById('voter-message');
    messageElement.textContent = message;
    messageElement.className = 'voter-message ' + type;
    messageElement.style.display = 'block';
    messageElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

async function loadCandidatesForVoting() {
    const candidates = await loadCandidates();
    const candidatesList = document.getElementById('candidates-list');
    candidatesList.innerHTML = '';

    if (candidates.length === 0) {
        candidatesList.innerHTML = '<p>No hay candidatos disponibles</p>';
        return;
    }

    candidates.forEach(candidate => {
        const card = document.createElement('div');
        card.className = 'card';
        card.dataset.id = candidate._id;
        card.innerHTML = `
            <h3>${candidate.name}</h3>
            <p>${candidate.description}</p>
        `;
        card.addEventListener('click', () => {
            document.querySelectorAll('.card').forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            selectedCandidateId = candidate._id;
        });
        candidatesList.appendChild(card);
    });
}

async function castVote() {
    if (!currentVoterId) {
        showVoterMessage('Por favor, verifique su identidad primero', 'error');
        return;
    }

    if (!selectedCandidateId) {
        showVoterMessage('Por favor, seleccione un candidato', 'error');
        return;
    }

    console.log('Datos enviados al servidor:', { voterId: currentVoterId, candidateId: selectedCandidateId });

    try {
        const response = await fetch(`${API_URL}/vote`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ voterId: currentVoterId, candidateId: selectedCandidateId })
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Error en la respuesta del servidor:', errorData);
            throw new Error(errorData.message || 'Error al emitir voto');
        }

        const result = await response.json();
        showVoterMessage('Voto registrado con éxito', 'success');
        document.getElementById('voting-section').style.display = 'none';
        selectedCandidateId = null;

        setTimeout(() => {
            openTab('results');
        }, 1500);
    } catch (error) {
        console.error('Error al emitir voto:', error);
        showVoterMessage(`Error: ${error.message || 'Error al conectar con el servidor'}`, 'error');
    }
}

async function loadResults() {
    try {
        const response = await fetch(`${API_URL}/results`);
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }
        const data = await response.json();
        const resultsList = document.getElementById('results-list');
        resultsList.innerHTML = '';

        if (data.candidates.length === 0) {
            resultsList.innerHTML = '<p>No hay resultados disponibles</p>';
            document.getElementById('winner-section').style.display = 'none';
            return;
        }

        const totalVotes = data.candidates.reduce((sum, candidate) => sum + candidate.votes, 0);

        data.candidates.forEach(candidate => {
            const card = document.createElement('div');
            card.className = 'results-card';
            const votePercentage = totalVotes > 0 ? (candidate.votes / totalVotes) * 100 : 0;
            card.innerHTML = `
                <div class="results-info">
                    <h3>${candidate.name}</h3>
                    <p>Votos: ${candidate.votes}</p>
                </div>
                <div class="results-bar">
                    <div class="progress-bar">
                        <div class="progress" style="width: ${votePercentage}%">
                            ${votePercentage.toFixed(1)}%
                        </div>
                    </div>
                </div>
            `;
            resultsList.appendChild(card);
        });

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
        document.getElementById('results-list').innerHTML = `<p>Error al cargar resultados: ${error.message || 'Error al conectar con el servidor'}</p>`;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    openTab('admin');
});
