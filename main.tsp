import "@typespec/http";
import "@typespec/openapi";
import "@typespec/rest";

using TypeSpec.Http;
using TypeSpec.OpenAPI;
using TypeSpec.Rest;

@service(#{ title: "Calendar Booking API" })
@summary("API для бронирования встреч без регистрации и авторизации")
@doc("Фиксирует публичный сценарий гостя и минимальные операции владельца календаря.")
namespace CalendarBookingApi;

alias Id = string;
alias EventDurationMinutes = 15 | 30 | 45 | 60;

@doc("Единая модель ошибки для клиентских и доменных ошибок.")
model ErrorResponse {
  @doc("Машиночитаемый код ошибки.")
  code: string;

  @doc("Человекочитаемое описание ошибки.")
  message: string;
}

@doc("Состояние готовности приложения принимать HTTP-запросы.")
model HealthResponse {
  @doc("Текущее состояние приложения.")
  status: "ok";
}

@doc("Один заранее заданный владелец календаря.")
model Owner {
  @doc("Идентификатор владельца календаря.")
  id: Id;

  @doc("Отображаемое имя владельца календаря.")
  name: string;
}

@doc("Тип события, который владелец создает для гостевого бронирования.")
model EventType {
  @doc("Серверный идентификатор типа события.")
  id: Id;

  @doc("Название типа события.")
  title: string;

  @doc("Описание типа события.")
  description: string;

  @doc("Длительность события в минутах. Значение должно быть кратно 15.")
  durationMinutes: EventDurationMinutes;
}

@doc("Данные для создания типа события владельцем календаря.")
model CreateEventTypeRequest {
  @doc("Название типа события.")
  title: string;

  @doc("Описание типа события.")
  description: string;

  @doc("Длительность события в минутах. Значение должно быть кратно 15.")
  durationMinutes: EventDurationMinutes;
}

@doc("Вычисляемый свободный слот для выбранного типа события.")
model Slot {
  @doc("Начало свободного слота в UTC. Конец вычисляется через durationMinutes выбранного EventType.")
  startsAt: utcDateTime;
}

@doc("Бронирование гостя, которое занимает интервал startsAt + durationMinutes связанного EventType.")
model Booking {
  @doc("Серверный идентификатор бронирования.")
  id: Id;

  @doc("Идентификатор выбранного типа события.")
  eventTypeId: Id;

  @doc("Начало бронирования в UTC.")
  startsAt: utcDateTime;

  @doc("Имя гостя.")
  guestName: string;

  @doc("Email гостя.")
  guestEmail: string;
}

@doc("Данные для создания бронирования гостем.")
model CreateBookingRequest {
  @doc("Идентификатор выбранного типа события.")
  eventTypeId: Id;

  @doc("Начало выбранного свободного слота в UTC.")
  startsAt: utcDateTime;

  @doc("Имя гостя.")
  guestName: string;

  @doc("Email гостя.")
  guestEmail: string;
}

@doc("Краткое описание типа события для списка встреч владельца.")
model EventTypeSummary {
  @doc("Идентификатор типа события.")
  id: Id;

  @doc("Название типа события.")
  title: string;

  @doc("Длительность события в минутах. Значение должно быть кратно 15.")
  durationMinutes: EventDurationMinutes;
}

@doc("Элемент единого хронологического списка предстоящих встреч владельца.")
model UpcomingBooking {
  @doc("Данные бронирования.")
  booking: Booking;

  @doc("Краткие данные типа события.")
  eventType: EventTypeSummary;
}

model OkResponse<T> {
  @statusCode statusCode: 200;
  @body body: T;
}

model CreatedResponse<T> {
  @statusCode statusCode: 201;
  @body body: T;
}

model BadRequestResponse {
  @statusCode statusCode: 400;
  @body body: ErrorResponse;
}

model NotFoundResponse {
  @statusCode statusCode: 404;
  @body body: ErrorResponse;
}

model ConflictResponse {
  @statusCode statusCode: 409;
  @body body: ErrorResponse;
}

@tag("System")
@route("/healthz")
interface SystemOperations {
  @summary("Проверить готовность приложения")
  @doc("Возвращает успешный ответ, когда HTTP API готов принимать запросы.")
  @get
  getHealth(): OkResponse<HealthResponse>;
}

@tag("Owner")
@route("/owner")
interface OwnerOperations {
  @summary("Получить профиль владельца календаря")
  @doc("Возвращает один заранее заданный read-only профиль владельца календаря.")
  @get
  getOwner(): OkResponse<Owner>;
}

@tag("Public")
@route("/event-types")
interface PublicEventTypeOperations {
  @summary("Получить публичные типы событий")
  @doc("Возвращает типы событий, доступные гостю для выбора.")
  @get
  listEventTypes(): OkResponse<EventType[]>;

  @summary("Получить свободные слоты типа события")
  @doc("""
  Возвращает вычисляемые свободные слоты для выбранного типа события.
  Слоты формируются на 14 календарных дней от начала текущей UTC-даты,
  в расписании 09:00-18:00 UTC. Прошедшие слоты текущего дня не возвращаются.
  """)
  @route("/{eventTypeId}/slots")
  @get
  listEventTypeSlots(
    @doc("Идентификатор типа события.")
    @path
    eventTypeId: Id,
  ): OkResponse<Slot[]> | NotFoundResponse;
}

@tag("Public")
@route("/bookings")
interface PublicBookingOperations {
  @summary("Создать бронирование")
  @doc("""
  Создает бронирование на выбранное начало слота.
  Сервер вычисляет занятый интервал как startsAt + durationMinutes выбранного EventType.
  Нельзя создать два бронирования на один и тот же или пересекающийся интервал.
  """)
  @post
  createBooking(
    @body request: CreateBookingRequest,
  ): CreatedResponse<Booking> | BadRequestResponse | NotFoundResponse | ConflictResponse;
}

@tag("Admin")
@route("/admin/event-types")
interface AdminEventTypeOperations {
  @summary("Получить типы событий владельца")
  @doc("Возвращает все типы событий, созданные владельцем календаря.")
  @get
  listAdminEventTypes(): OkResponse<EventType[]>;

  @summary("Создать тип события")
  @doc("Создает тип события. Идентификатор генерирует сервер.")
  @post
  createEventType(
    @body request: CreateEventTypeRequest,
  ): CreatedResponse<EventType> | BadRequestResponse;
}

@tag("Admin")
@route("/admin/bookings")
interface AdminBookingOperations {
  @summary("Получить предстоящие встречи")
  @doc("Возвращает будущие бронирования всех типов событий с startsAt >= now, отсортированные по startsAt по возрастанию.")
  @route("/upcoming")
  @get
  listUpcomingBookings(): OkResponse<UpcomingBooking[]>;
}
