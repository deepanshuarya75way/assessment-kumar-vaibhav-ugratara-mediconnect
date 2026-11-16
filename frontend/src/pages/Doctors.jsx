import React, { useContext, useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AppContext } from '../context/AppContext'


//formatting time to match db
const formatSlotTime = (totalMinutes) => {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  const period = hours >= 12 ? 'PM' : 'AM';
  const formattedHours = hours % 12 || 12;

  return `${String(formattedHours).padStart(2, '0')}:${String(minutes).padStart(2, '0')} ${period}`;
};

const generateAvailableSlots = (doctor, dateValue) => {
  const [year, month, day] = dateValue.split('-').map(Number);

  //convert YYYY-MM-DD into D_M_YYYY
  const dateKey = `${day}_${month}_${year}`;

  const bookedSlots = doctor.slots_booked?.[dateKey] || [];

  const selectedDate = new Date(year, month - 1, day);
  const now = new Date();

  const isToday =
    selectedDate.toDateString() === now.toDateString();

  //appointment hours: 10 AM to 9 PM
  let startMinutes = 10 * 60;
  const endMinutes = 21 * 60;

  if (isToday) {
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    startMinutes = Math.max(
      startMinutes,
      Math.ceil((currentMinutes + 1) / 30) * 30
    );
  }

  const availableSlots = [];

  for (
    let minutes = startMinutes;
    minutes < endMinutes;
    minutes += 30
  ) {
    const slotTime = formatSlotTime(minutes);

    if (!bookedSlots.includes(slotTime)) {
      availableSlots.push({
        time: slotTime,
        minutes
      });
    }
  }

  return availableSlots;
};



const Doctors = () => {

  const { speciality } = useParams();
  const [filterDoc, setFilterDoc] = useState([]);
  const [showFilter, setShowFilter] = useState(false);
  const navigate = useNavigate();

  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');

  const { doctors } = useContext(AppContext);

  const today = (() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  })();

  const maxDate = (() => {
    const date = new Date();
    date.setDate(date.getDate() + 6);

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  })();

  const timeOptions = Array.from({ length: 22 }, (_, i) => {
    const minutes = 10 * 60 + i * 30;

    const hours24 = Math.floor(minutes / 60);
    const mins = minutes % 60;

    const value = `${String(hours24).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;

    return {
      value,
      label: formatSlotTime(minutes)
    };
  });



  const applyFilter = () => {
    let filteredDoctors = [...(doctors || [])];

    //filter by speciality
    if (speciality) {
      filteredDoctors = filteredDoctors.filter(
        doc => doc.speciality === speciality
      );
    }


    //filter by date and time  
    if (selectedDate) {
      const [year, month, day] = selectedDate.split('-').map(Number);
      const dateKey = `${day}_${month}_${year}`;

      filteredDoctors = filteredDoctors.filter(doc => {
        if (!doc.available) return false;

        const bookedSlots = doc.slots_booked?.[dateKey] || [];

        if (!selectedTime) {
          const availableSlots = generateAvailableSlots(doc, selectedDate);
          return availableSlots.length > 0;
        }

        const [hours, minutes] = selectedTime.split(':').map(Number);

        const period = hours >= 12 ? 'PM' : 'AM';
        const formattedHours = hours % 12 || 12;

        const slotTime =
          `${String(formattedHours).padStart(2, '0')}:${String(minutes).padStart(2, '0')} ${period}`;

        return !bookedSlots.includes(slotTime);
      });
    }


    setFilterDoc(filteredDoctors);
  };


  useEffect(() => {
    applyFilter();
  }, [doctors, speciality, selectedDate, selectedTime]);

  const clearDateFilter = () => {
    setSelectedDate('');
    setSelectedTime('');
  };


  const filteredTimeOptions = timeOptions.filter(option => {
    if (selectedDate !== today) return true;

    const now = new Date();

    const currentMinutes =
      now.getHours() * 60 + now.getMinutes();

    const optionMinutes = (() => {
      const [hours, minutes] = option.value.split(':').map(Number);
      return hours * 60 + minutes;
    })();

    const nextSlotMinutes = Math.max(
      600,
      Math.ceil((currentMinutes + 1) / 30) * 30
    );

    return optionMinutes >= nextSlotMinutes;
  });



  return (
    <div>

      <p className='text-gray-600'>
        Browse through the doctors specialist.
      </p>

      {/* Filters */}
      <div className='flex flex-col sm:flex-row items-start gap-5 mt-5'>

        <button
          onClick={() => setShowFilter(!showFilter)}
          className={`py-1 px-3 border rounded text-sm transition-all sm:hidden ${showFilter ? 'bg-primary text-white' : ''
            }`}
        >
          Filters
        </button>

        <div className={`flex-col gap-4 text-sm text-gray-600 ${showFilter ? 'flex' : 'hidden sm:flex'
          }`}>

          {/* Date and Time Filter */}
          <div className="flex flex-col gap-3">

            <input
              type="date"
              min={today}
              max={maxDate}
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value);
                setSelectedTime('');
              }}
              className="border border-gray-300 rounded px-3 py-2"
            />

            <select
              value={selectedTime}
              onChange={(e) => setSelectedTime(e.target.value)}
              disabled={!selectedDate}
              className="border border-gray-300 rounded px-3 py-2 disabled:bg-gray-100"
            >
              <option value="">Select Time</option>

              {filteredTimeOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}

            </select>

            <button
              onClick={clearDateFilter}
              className="text-left text-blue-600 hover:underline"
            >
              Clear date filter
            </button>

          </div>

          {/* Speciality Filters */}
          <p
            onClick={() => speciality === 'General physician'
              ? navigate('/doctors')
              : navigate('/doctors/General physician')}
            className={`w-[94vw] sm:w-auto pl-3 py-1.5 pr-16 border border-gray-300 rounded transition-all cursor-pointer ${speciality === 'General physician' ? 'bg-[#E2E5FF] text-black' : ''
              }`}
          >
            General physician
          </p>

          <p
            onClick={() => speciality === 'Gynecologist'
              ? navigate('/doctors')
              : navigate('/doctors/Gynecologist')}
            className={`w-[94vw] sm:w-auto pl-3 py-1.5 pr-16 border border-gray-300 rounded transition-all cursor-pointer ${speciality === 'Gynecologist' ? 'bg-[#E2E5FF] text-black' : ''
              }`}
          >
            Gynecologist
          </p>

          <p
            onClick={() => speciality === 'Dermatologist'
              ? navigate('/doctors')
              : navigate('/doctors/Dermatologist')}
            className={`w-[94vw] sm:w-auto pl-3 py-1.5 pr-16 border border-gray-300 rounded transition-all cursor-pointer ${speciality === 'Dermatologist' ? 'bg-[#E2E5FF] text-black' : ''
              }`}
          >
            Dermatologist
          </p>

          <p
            onClick={() => speciality === 'Pediatricians'
              ? navigate('/doctors')
              : navigate('/doctors/Pediatricians')}
            className={`w-[94vw] sm:w-auto pl-3 py-1.5 pr-16 border border-gray-300 rounded transition-all cursor-pointer ${speciality === 'Pediatricians' ? 'bg-[#E2E5FF] text-black' : ''
              }`}
          >
            Pediatricians
          </p>

          <p
            onClick={() => speciality === 'Neurologist'
              ? navigate('/doctors')
              : navigate('/doctors/Neurologist')}
            className={`w-[94vw] sm:w-auto pl-3 py-1.5 pr-16 border border-gray-300 rounded transition-all cursor-pointer ${speciality === 'Neurologist' ? 'bg-[#E2E5FF] text-black' : ''
              }`}
          >
            Neurologist
          </p>

          <p
            onClick={() => speciality === 'Gastroenterologist'
              ? navigate('/doctors')
              : navigate('/doctors/Gastroenterologist')}
            className={`w-[94vw] sm:w-auto pl-3 py-1.5 pr-16 border border-gray-300 rounded transition-all cursor-pointer ${speciality === 'Gastroenterologist' ? 'bg-[#E2E5FF] text-black' : ''
              }`}
          >
            Gastroenterologist
          </p>

        </div>


        {/* Doctors List */}
        <div className='w-full grid grid-cols-auto gap-4 gap-y-6'>

          {filterDoc.map((item, index) => (

            <div
              onClick={() => {
                navigate(`/appointment/${item._id}`);
                scrollTo(0, 0);
              }}
              className='border border-[#C9D8FF] rounded-xl overflow-hidden cursor-pointer hover:translate-y-[-10px] transition-all duration-500'
              key={item._id || index}
            >

              <img
                className='bg-[#EAEFFF]'
                src={item.image}
                alt=""
              />

              <div className='p-4'>

                <div className={`flex items-center gap-2 text-sm text-center ${item.available ? 'text-green-500' : 'text-gray-500'
                  }`}>

                  <p className={`w-2 h-2 rounded-full ${item.available ? 'bg-green-500' : 'bg-gray-500'
                    }`}></p>

                  <p>
                    {item.available ? 'Available' : 'Not Available'}
                  </p>

                </div>

                <p className='text-[#262626] text-lg font-medium'>
                  {item.name}
                </p>

                <p className='text-[#5C5C5C] text-sm'>
                  {item.speciality}
                </p>

              </div>

            </div>

          ))}

        </div>

      </div>

    </div>
  );
};

export default Doctors
