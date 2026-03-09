'use client';

import { memo, useState, useCallback, useEffect } from 'react';
import {
  Calendar,
  Clock,
  List,
  Settings2,
  Maximize2,
  Minimize2,
  BarChart3,
  History,
  Lock,
} from 'lucide-react';
import type { Order } from '@/types/order';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { SchedulingSidebar } from './scheduling-sidebar';
import { SchedulingCalendar } from './scheduling-calendar';
import { SchedulingTimeline } from './scheduling-timeline';
import { SchedulingListView } from './scheduling-list-view';
import { SchedulingKPICompact } from './scheduling-kpi-bar';
import { AssignmentModal } from './assignment-modal';
import { SchedulingOrderDetail } from './scheduling-order-detail';
import { SchedulingCalendarFilters } from './scheduling-calendar-filters';
import { SchedulingExport } from './scheduling-export';
import { SchedulingNotifications } from './scheduling-notifications';

import { SchedulingGantt } from './scheduling-gantt';
import { SchedulingAuditLog } from './scheduling-audit-log';
import { SchedulingBlockDay } from './scheduling-block-day';
import { useScheduling } from '@/hooks/use-scheduling';
import { cn } from '@/lib/utils';

type MainView = 'calendar' | 'timeline' | 'list' | 'gantt';

interface SchedulingLayoutProps {
  /** Clase adicional */
  className?: string;
}

// COMPONENTE PRINCIPAL

export const SchedulingLayout = memo(function SchedulingLayout({
  className,
}: SchedulingLayoutProps) {
  const [mainView, setMainView] = useState<MainView>('calendar');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const {
    pendingOrders,
    allOrders,
    filteredAllOrders,
    calendarData,
    timelines,
    kpis,
    vehicles,
    drivers,
    suggestions,
    conflicts,
    hosValidation,
    config,
    currentMonth,
    calendarView,
    selectedDate,
    isLoading,
    isScheduling,
    isLoadingSuggestions,
    // Modal
    assignmentModal,
    pendingFilters,
    stateFilter,
    listSearch,
    setCurrentMonth,
    setCalendarView,
    setSelectedDate,
    setPendingFilters,
    setStateFilter,
    setListSearch,
    // Drag & Drop
    handleDragStart,
    handleDragEnd,
    draggingOrder,
    openAssignmentModal,
    closeAssignmentModal,
    confirmAssignment,
    requestSuggestions,
    validateHOS,
    // Feature 2: Order Detail
    detailOrder,
    isDetailOpen,
    openOrderDetail,
    closeOrderDetail,
    // Feature 4: Calendar Filters
    calendarFilters,
    setCalendarFilters,
    // Feature 5: Export
    exportOrders,
    // Feature 6: Notifications
    notifications,
    markNotificationRead,
    dismissNotification,
    clearAllNotifications,
    // Feature 8: Gantt
    ganttData,
    ganttStartDate,
    setGanttStartDate,
    isLoadingGantt,
    // Feature 9: Audit Log
    auditLogs,
    isAuditLogOpen,
    openAuditLog,
    closeAuditLog,
    isLoadingAuditLogs,
    // Feature 10: Block Day
    blockedDays,
    isBlockDayOpen,
    blockDayPreselectedDate,
    openBlockDay,
    closeBlockDay,
    confirmBlockDay,
    confirmUnblockDay,
    isBlockingDay,
  } = useScheduling();

  // ----------------------------------------
  // HANDLERS
  // ----------------------------------------
  const handleOrderDrop = useCallback((order: Order, date: Date) => {
    openAssignmentModal(order, date);
  }, [openAssignmentModal]);

  const handleTimelineOrderDrop = useCallback((order: Order, resourceId: string, hour: number) => {
    const date = new Date(currentMonth);
    date.setHours(hour, 0, 0, 0);
    
    // Determinar si es vehículo o conductor
    const timeline = timelines.find(t => t.resourceId === resourceId);
    if (timeline) {
      openAssignmentModal(order, date);
    }
  }, [currentMonth, timelines, openAssignmentModal]);

  const handleAddOrder = useCallback((date: Date) => {
    setSelectedDate(date);
    // Abrir modal con la primera orden pendiente para esa fecha
    if (pendingOrders.length > 0) {
      openAssignmentModal(pendingOrders[0], date);
    }
  }, [setSelectedDate, pendingOrders, openAssignmentModal]);

  const handleTimeSlotClick = useCallback((resourceId: string, hour: number) => {
    const date = new Date(currentMonth);
    date.setHours(hour, 0, 0, 0);
    setSelectedDate(date);
  }, [currentMonth, setSelectedDate]);

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(prev => !prev);
  }, []);

  // ----------------------------------------
  // RENDER
  // ----------------------------------------
  return (
    <TooltipProvider>
      <div
        className={cn(
          'flex flex-col h-full bg-background',
          isFullscreen && 'fixed inset-0 z-50',
          className
        )}
      >
        {/* Header con KPIs y controles */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b bg-card">
          {/* KPIs */}
          <div className="overflow-x-auto">
            <SchedulingKPICompact kpis={kpis} isLoading={isLoading} />
          </div>

          {/* Controles */}
          <div className="flex items-center gap-2 px-2 sm:px-4 py-2 md:py-0 overflow-x-auto">
            {/* Selector de vista principal */}
            <Tabs
              value={mainView}
              onValueChange={(v) => setMainView(v as MainView)}
            >
              <TabsList className="h-8">
                <TabsTrigger value="calendar" className="h-7 px-2 sm:px-3 text-xs gap-1 sm:gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Calendario</span>
                </TabsTrigger>
                <TabsTrigger value="timeline" className="h-7 px-2 sm:px-3 text-xs gap-1 sm:gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Timeline</span>
                </TabsTrigger>
                <TabsTrigger value="list" className="h-7 px-2 sm:px-3 text-xs gap-1 sm:gap-1.5">
                  <List className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Lista</span>
                </TabsTrigger>
                <TabsTrigger value="gantt" className="h-7 px-2 sm:px-3 text-xs gap-1 sm:gap-1.5">
                  <BarChart3 className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Gantt</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <Separator orientation="vertical" className="h-6" />

            {/* Botones de funcionalidades */}
            <div className="flex items-center gap-1">
              {/* Export */}
              <SchedulingExport orders={exportOrders} />

              {/* Notifications */}
              <SchedulingNotifications
                notifications={notifications}
                onMarkRead={markNotificationRead}
                onDismiss={dismissNotification}
                onClearAll={clearAllNotifications}
              />

              {/* Block Day */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => openBlockDay()}
                  >
                    <Lock className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Bloquear día</TooltipContent>
              </Tooltip>

              {/* Audit Log */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={openAuditLog}
                  >
                    <History className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Historial de cambios</TooltipContent>
              </Tooltip>

              <Separator orientation="vertical" className="h-6" />

              {/* Fullscreen */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={toggleFullscreen}
                  >
                    {isFullscreen ? (
                      <Minimize2 className="h-4 w-4" />
                    ) : (
                      <Maximize2 className="h-4 w-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                  >
                    <Settings2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  Configuración
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </div>

        {/* Calendar Filters Bar (solo en vista calendario) */}
        {mainView === 'calendar' && (
          <SchedulingCalendarFilters
            filters={calendarFilters}
            vehicles={vehicles}
            onFiltersChange={setCalendarFilters}
          />
        )}

        {/* Contenido principal */}
        <div className="flex-1 flex overflow-hidden relative">
          {/* Sidebar de órdenes pendientes (solo en calendar/timeline) */}
          {(mainView === 'calendar' || mainView === 'timeline') && (
            <>
              {/* Overlay mobile */}
              {isMobile && !isSidebarCollapsed && (
                <div
                  className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
                  onClick={() => setIsSidebarCollapsed(true)}
                />
              )}
              <div className={cn(
                isMobile
                  ? 'fixed inset-y-0 left-0 z-50 w-72 transition-transform duration-300 bg-background shadow-xl'
                  : '',
                isMobile && isSidebarCollapsed && '-translate-x-full',
                isMobile && !isSidebarCollapsed && 'translate-x-0'
              )}>
                <SchedulingSidebar
                  orders={pendingOrders}
                  isLoading={isLoading}
                  filters={pendingFilters}
                  onFiltersChange={setPendingFilters}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                  onOrderClick={(order) => openOrderDetail(order)}
                  isCollapsed={isMobile ? false : isSidebarCollapsed}
                  onToggleCollapse={() => setIsSidebarCollapsed(prev => !prev)}
                />
              </div>
            </>
          )}

          {/* Botón para abrir sidebar en mobile */}
          {isMobile && isSidebarCollapsed && (mainView === 'calendar' || mainView === 'timeline') && (
            <Button
              variant="outline"
              size="sm"
              className="absolute left-2 top-2 z-30 shadow-md md:hidden"
              onClick={() => setIsSidebarCollapsed(false)}
            >
              <List className="h-4 w-4 mr-1" />
              Pendientes
            </Button>
          )}

          {/* Vista principal */}
          <div className="flex-1 flex flex-col min-h-0 p-2 sm:p-4 overflow-hidden">
            {mainView === 'calendar' ? (
              <SchedulingCalendar
                calendarData={calendarData}
                currentMonth={currentMonth}
                view={calendarView}
                selectedDate={selectedDate}
                draggingOrder={draggingOrder}
                isLoading={isLoading}
                onMonthChange={setCurrentMonth}
                onViewChange={setCalendarView}
                onDateSelect={setSelectedDate}
                onOrderDrop={handleOrderDrop}
                onOrderClick={(order) => openOrderDetail(order)}
                onAddOrder={handleAddOrder}
                className="flex-1 min-h-0"
              />
            ) : mainView === 'timeline' ? (
              <SchedulingTimeline
                timelines={timelines}
                currentDate={selectedDate || currentMonth}
                isLoading={isLoading}
                onDateChange={setCurrentMonth}
                onTimeSlotClick={handleTimeSlotClick}
                onOrderDrop={handleTimelineOrderDrop}
                onOrderClick={(order) => openOrderDetail(order)}
                className="flex-1 min-h-0"
              />
            ) : mainView === 'gantt' ? (
              <SchedulingGantt
                ganttData={ganttData}
                startDate={ganttStartDate}
                isLoading={isLoadingGantt}
                onDateRangeChange={setGanttStartDate}
                onCellClick={(_resourceId: string, date: Date) => {
                  setSelectedDate(date);
                  setMainView('calendar');
                }}
                className="flex-1 min-h-0"
              />
            ) : (
              <SchedulingListView
                orders={filteredAllOrders}
                allOrders={allOrders}
                stateFilter={stateFilter}
                searchValue={listSearch}
                isLoading={isLoading}
                onStateFilterChange={setStateFilter}
                onSearchChange={setListSearch}
                onScheduleOrder={(order) => openAssignmentModal(order)}
                onOrderClick={(order) => openOrderDetail(order)}
                className="flex-1 min-h-0"
              />
            )}
          </div>

          {/* Feature 2: Order Detail Side Panel */}
          <SchedulingOrderDetail
            order={detailOrder}
            isOpen={isDetailOpen}
            onClose={closeOrderDetail}
            onSchedule={(order) => {
              closeOrderDetail();
              openAssignmentModal(order);
            }}
          />

          {/* Feature 9: Audit Log Side Panel */}
          <SchedulingAuditLog
            logs={auditLogs}
            isOpen={isAuditLogOpen}
            isLoading={isLoadingAuditLogs}
            onClose={closeAuditLog}
          />
        </div>

        {/* Modal de asignación */}
        <AssignmentModal
          open={assignmentModal.isOpen}
          order={assignmentModal.order}
          proposedDate={assignmentModal.proposedDate}
          vehicles={vehicles}
          drivers={drivers}
          suggestions={suggestions}
          conflicts={conflicts}
          hosValidation={hosValidation}
          featureFlags={config}
          isLoading={isScheduling}
          isLoadingSuggestions={isLoadingSuggestions}
          onClose={closeAssignmentModal}
          onConfirm={confirmAssignment}
          onRequestSuggestions={requestSuggestions}
          onValidateHOS={validateHOS}
        />

        {/* Feature 10: Block Day Dialog */}
        <SchedulingBlockDay
          open={isBlockDayOpen}
          blockedDays={blockedDays}
          vehicles={vehicles}
          preselectedDate={blockDayPreselectedDate}
          isLoading={isBlockingDay}
          onClose={closeBlockDay}
          onBlockDay={confirmBlockDay}
          onUnblockDay={confirmUnblockDay}
        />
      </div>
    </TooltipProvider>
  );
});
