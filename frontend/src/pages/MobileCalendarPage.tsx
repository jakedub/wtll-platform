import React, { Fragment, useMemo, useState, useEffect } from 'react'
import PropTypes from 'prop-types'

import * as dates from 'date-arithmetic'
import { Calendar, Views, Navigate, DateLocalizer } from 'react-big-calendar'
// @ts-expect-error no types available for internal module
import TimeGrid from 'react-big-calendar/lib/TimeGrid' // use 'react-big-calendar/lib/TimeGrid'. Can't 'alias' in Storybook'

// temporary typing fix for custom views
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const events: any[] = []

function MyWeek({
  date,
  localizer,
  max = localizer.endOf(new Date(), 'day'),
  min = localizer.startOf(new Date(), 'day'),
  scrollToTime = localizer.startOf(new Date(), 'day'),
  ...props
}: any) {
  const currRange = useMemo(
    () => MyWeek.range(date, { localizer }),
    [date, localizer]
  )

  return (
    <TimeGrid
      date={date}
      eventOffset={15}
      localizer={localizer}
      max={max}
      min={min}
      range={currRange}
      scrollToTime={scrollToTime}
      {...props}
    />
  )
}

MyWeek.propTypes = {
  date: PropTypes.instanceOf(Date).isRequired,
  localizer: PropTypes.object,
  max: PropTypes.instanceOf(Date),
  min: PropTypes.instanceOf(Date),
  scrollToTime: PropTypes.instanceOf(Date),
}

MyWeek.range = (date: any, { localizer }: any) => {
  const start = date
  const end = dates.add(start, 2, 'day')

  let current = start
  const range = []

  while (localizer.lte(current, end, 'day')) {
    range.push(current)
    current = localizer.add(current, 1, 'day')
  }

  return range
}

MyWeek.navigate = (date: any, action: any, { localizer }: any) => {
  switch (action) {
    case Navigate.PREVIOUS:
      return localizer.add(date, -3, 'day')

    case Navigate.NEXT:
      return localizer.add(date, 3, 'day')

    default:
      return date
  }
}

MyWeek.title = (date: any) => {
  return `My awesome week: ${date.toLocaleDateString()}`
}

function MyThreeDay({
  date,
  localizer,
  max = localizer.endOf(new Date(), 'day'),
  min = localizer.startOf(new Date(), 'day'),
  scrollToTime = localizer.startOf(new Date(), 'day'),
  ...props
}: any) {
  const currRange = useMemo(
    () => MyThreeDay.range(date, { localizer }),
    [date, localizer]
  )

  return (
    <TimeGrid
      date={date}
      eventOffset={15}
      localizer={localizer}
      max={max}
      min={min}
      range={currRange}
      scrollToTime={scrollToTime}
      {...props}
    />
  )
}

MyThreeDay.range = (date: any, { localizer }: any) => {
  const start = date
  const end = dates.add(start, 2, 'day')

  let current = start
  const range = []

  while (localizer.lte(current, end, 'day')) {
    range.push(current)
    current = localizer.add(current, 1, 'day')
  }

  return range
}

MyThreeDay.navigate = MyWeek.navigate
MyThreeDay.title = (date: any) => `3 Day View: ${date.toLocaleDateString()}`

export default function CustomView({ localizer }: any) {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const defaultDate = useMemo(() => new Date(2015, 3, 1), [])

  const views = useMemo(() => {
    if (isMobile) {
      return {
        month: true,
        threeDay: MyThreeDay,
      }
    }

    return {
      month: true,
      week: MyWeek,
    }
  }, [isMobile])

  return (
    <Fragment>
      <div className="height600">
        <Calendar
          defaultDate={defaultDate}
          defaultView={(isMobile ? 'threeDay' : Views.WEEK) as any}
          events={events}
          localizer={localizer}
          views={views as any}
        />
      </div>
    </Fragment>
  )
}
CustomView.propTypes = {
  localizer: PropTypes.instanceOf(DateLocalizer),
}