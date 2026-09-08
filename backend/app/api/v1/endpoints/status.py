from fastapi import APIRouter

router = APIRouter()

@router.get("/health", tags=["Status"])
def health_check():
    return {
        "status": "online",
        "projeto": "CEEP+",
        "escola": "Centro Estadual de Educação Profissional Pedro Boaretto Neto",
        "ambiente": "Desenvolvimento - ExpoCEEP",
        "versao": "1.0.0"
    }
