from fastapi import APIRouter
from app.api.v1.endpoints import (
    status,
    auth,
    student,
    schedules,
    notices,
    tasks,
    canteen,
    management
)

api_router = APIRouter()

api_router.include_router(status.router, prefix="/status", tags=["Status"])
api_router.include_router(auth.router, prefix="/auth", tags=["Autenticação"])
api_router.include_router(student.router, prefix="/student", tags=["Aluno"])
api_router.include_router(schedules.router, prefix="/schedules", tags=["Horários"])
api_router.include_router(notices.router, prefix="/notices", tags=["Avisos"])
api_router.include_router(tasks.router, prefix="/tasks", tags=["Tarefas"])
api_router.include_router(canteen.router, prefix="/canteen", tags=["Cantina"])
api_router.include_router(management.router, prefix="/management", tags=["Gestão"])
