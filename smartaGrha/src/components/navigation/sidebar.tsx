import * as FaIcons from 'react-icons/fa';
import * as AiIcons from 'react-icons/ai';
import * as IoIcons from 'react-icons/io';

export const SidebarData = [
  {
    title: 'Home',
    path: '/',
    icon: <AiIcons.AiFillHome />,
    cName: 'nav-text',
  },
  {
    title: 'All Room',
    path: '/room-control',
    icon: <IoIcons.IoMdBusiness />,
    cName: 'nav-text',
  },
  {
    title: 'HomeDeviceData',
    path: '/device-data',
    icon: <FaIcons.FaDatabase />,
    cName: 'nav-text',
  },
  {
    title: 'Camera',
    path: '/camera',
    icon: <IoIcons.IoMdCamera />,
    cName: 'nav-text',
  },
  {
    title: 'HomePowerSystem',
    path: '/power-supply',
    icon: <FaIcons.FaPowerOff />,
    cName: 'nav-text',
  },
  {
    title: 'LED Strip',
    path: '/strip-led',
    icon: <IoIcons.IoIosColorPalette />,
    cName: 'nav-text',
  },
  {
    title: 'Weather',
    path: '/weather',
    icon: <AiIcons.AiFillWechat />,
    cName: 'nav-text',
  },
  {
    title: 'Settings',
    path: '/settings',
    icon: <AiIcons.AiFillSetting />,
    cName: 'nav-text',
  },
  {
    title: 'Profile',
    path: '/profile',
    icon: <AiIcons.AiFillProfile />,
    cName: 'nav-text',
  },
];
