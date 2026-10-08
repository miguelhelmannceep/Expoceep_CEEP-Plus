from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any, List
from sqlalchemy.orm import Session
from app.models.horario import Horario

# Timezone oficial de Brasília (America/Sao_Paulo / UTC-3)
try:
    from zoneinfo import ZoneInfo
    BRASILIA_TZ = ZoneInfo("America/Sao_Paulo")
except Exception:
    BRASILIA_TZ = timezone(timedelta(hours=-3))

WEEKDAYS_PT = {
    0: "Segunda-feira",
    1: "Terça-feira",
    2: "Quarta-feira",
    3: "Quinta-feira",
    4: "Sexta-feira",
    5: "Sábado",
    6: "Domingo"
}

SCHOOL_DAYS = [
    "Segunda-feira",
    "Terça-feira",
    "Quarta-feira",
    "Quinta-feira",
    "Sexta-feira"
]


def get_brasilia_now() -> datetime:
    """Retorna datetime atual com timezone de Brasília."""
    try:
        return datetime.now(BRASILIA_TZ)
    except Exception:
        return datetime.now(timezone(timedelta(hours=-3)))


def format_schedule_dict(h: Horario) -> Dict[str, Any]:
    disc_nome = h.disciplina_rel.nome if getattr(h, "disciplina_rel", None) else (h.disciplina or "Disciplina")
    prof_nome = h.professor_rel.nome if getattr(h, "professor_rel", None) else (h.professor or "Professor")
    return {
        "horario_inicio": h.horario_inicio,
        "horario_fim": h.horario_fim,
        "disciplina": disc_nome,
        "professor": prof_nome,
        "sala": getattr(h, "sala", None),
        "dia_semana": h.dia_semana
    }


def find_next_school_day_class(
    all_schedules: List[Horario],
    current_day: str
) -> Optional[Dict[str, Any]]:
    """Encontra a primeira aula disponível a partir do próximo dia letivo."""
    if not all_schedules:
        return None

    # Ordenação dos dias subsequentes a partir do dia atual
    if current_day in SCHOOL_DAYS:
        start_idx = (SCHOOL_DAYS.index(current_day) + 1) % len(SCHOOL_DAYS)
        ordered_days = [SCHOOL_DAYS[(start_idx + i) % len(SCHOOL_DAYS)] for i in range(len(SCHOOL_DAYS))]
    else:
        # Se for sábado ou domingo, próximo dia letivo é Segunda-feira
        ordered_days = list(SCHOOL_DAYS)

    for day in ordered_days:
        day_schedules = [h for h in all_schedules if h.dia_semana == day]
        if day_schedules:
            day_schedules.sort(key=lambda x: x.horario_inicio)
            return format_schedule_dict(day_schedules[0])

    return None


def detect_student_schedules(
    db: Session,
    turma_id: Optional[int],
    reference_dt: Optional[datetime] = None
) -> Dict[str, Any]:
    """
    Identifica de forma confiável e em Horário de Brasília:
    - dia atual
    - horário atual
    - aula atual (se houver aula em andamento)
    - próxima aula (no mesmo dia ou no próximo dia letivo)
    - status da rotina de aulas
    """
    if reference_dt is None:
        ref_dt = get_brasilia_now()
    else:
        # Garante que referência tenha fuso horário de Brasília se ingênua
        if reference_dt.tzinfo is None:
            ref_dt = reference_dt.replace(tzinfo=BRASILIA_TZ)
        else:
            ref_dt = reference_dt.astimezone(BRASILIA_TZ)

    dia_semana_atual = WEEKDAYS_PT[ref_dt.weekday()]
    horario_atual_str = ref_dt.strftime("%H:%M")
    is_dia_letivo = dia_semana_atual in SCHOOL_DAYS

    # Caso: aluno sem turma vinculada
    if not turma_id:
        return {
            "aula_atual": None,
            "proxima_aula": None,
            "status_aulas": "SEM_TURMA",
            "mensagem_aulas": "Defina seu curso e turma no Perfil para visualizar seus horários.",
            "dia_semana_atual": dia_semana_atual,
            "horario_atual": horario_atual_str,
            "is_dia_letivo": is_dia_letivo
        }

    # Carrega horários ativos da turma
    turma_horarios = db.query(Horario).filter(
        Horario.turma_id == turma_id,
        (Horario.ativo == True) | (Horario.ativo == None)
    ).all()

    if not turma_horarios:
        return {
            "aula_atual": None,
            "proxima_aula": None,
            "status_aulas": "SEM_HORARIOS",
            "mensagem_aulas": "Nenhum horário cadastrado para a turma selecionada.",
            "dia_semana_atual": dia_semana_atual,
            "horario_atual": horario_atual_str,
            "is_dia_letivo": is_dia_letivo
        }

    # Horários de hoje
    horarios_hoje = [h for h in turma_horarios if h.dia_semana == dia_semana_atual]
    horarios_hoje.sort(key=lambda x: x.horario_inicio)

    # 1. Fim de semana (Sábado ou Domingo)
    if not is_dia_letivo:
        proxima = find_next_school_day_class(turma_horarios, dia_semana_atual)
        return {
            "aula_atual": None,
            "proxima_aula": proxima,
            "status_aulas": "FIM_DE_SEMANA",
            "mensagem_aulas": "Fim de semana: não há aulas programadas para hoje.",
            "dia_semana_atual": dia_semana_atual,
            "horario_atual": horario_atual_str,
            "is_dia_letivo": False
        }

    # Se hoje é dia letivo mas a turma não tem aula cadastrada hoje
    if not horarios_hoje:
        proxima = find_next_school_day_class(turma_horarios, dia_semana_atual)
        return {
            "aula_atual": None,
            "proxima_aula": proxima,
            "status_aulas": "SEM_AULAS_HOJE",
            "mensagem_aulas": "Não há aulas programadas para sua turma hoje.",
            "dia_semana_atual": dia_semana_atual,
            "horario_atual": horario_atual_str,
            "is_dia_letivo": True
        }

    # 2. Identificação da Aula Atual (horario_inicio <= now < horario_fim)
    aula_atual_obj = None
    for h in horarios_hoje:
        if h.horario_inicio <= horario_atual_str < h.horario_fim:
            aula_atual_obj = h
            break

    # 3. Identificação da Próxima Aula
    proxima_aula_obj = None
    if aula_atual_obj:
        # Próxima aula é a primeira que inicia após o término da aula atual
        for h in horarios_hoje:
            if h.horario_inicio >= aula_atual_obj.horario_fim:
                proxima_aula_obj = h
                break
    else:
        # Sem aula em andamento: próxima aula é a primeira que inicia após o horário atual
        for h in horarios_hoje:
            if h.horario_inicio > horario_atual_str:
                proxima_aula_obj = h
                break

    # Formatação dos resultados
    aula_atual_dict = format_schedule_dict(aula_atual_obj) if aula_atual_obj else None
    
    if proxima_aula_obj:
        proxima_aula_dict = format_schedule_dict(proxima_aula_obj)
    else:
        # Se não há mais aulas hoje, busca a primeira aula do próximo dia letivo
        proxima_aula_dict = find_next_school_day_class(turma_horarios, dia_semana_atual)

    # Determinação do status descritivo
    primeira_aula = horarios_hoje[0]
    ultima_aula = horarios_hoje[-1]

    if aula_atual_obj:
        if proxima_aula_obj:
            status_aulas = "EM_AULA"
            mensagem_aulas = f"Aula em andamento: {aula_atual_dict['disciplina']}."
        else:
            status_aulas = "ULTIMA_AULA_EM_ANDAMENTO"
            mensagem_aulas = f"Última aula do dia em andamento: {aula_atual_dict['disciplina']}."
    elif horario_atual_str < primeira_aula.horario_inicio:
        status_aulas = "ANTES_PRIMEIRA_AULA"
        mensagem_aulas = f"Aulas iniciam às {primeira_aula.horario_inicio}."
    elif horario_atual_str >= ultima_aula.horario_fim:
        status_aulas = "ENCERRADO_HOJE"
        mensagem_aulas = "Aulas de hoje encerradas."
    else:
        status_aulas = "INTERVALO_ENTRE_AULAS"
        mensagem_aulas = "Intervalo / Entre aulas."

    return {
        "aula_atual": aula_atual_dict,
        "proxima_aula": proxima_aula_dict,
        "status_aulas": status_aulas,
        "mensagem_aulas": mensagem_aulas,
        "dia_semana_atual": dia_semana_atual,
        "horario_atual": horario_atual_str,
        "is_dia_letivo": True
    }
