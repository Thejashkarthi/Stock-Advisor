import React from 'react'

const Footer = () => {
    const year=new Date();
    return (
        <footer>let this year be an unforgetful number {year.getFullYear()}</footer>
    )
}

export default Footer